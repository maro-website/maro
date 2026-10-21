import "server-only";
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin, getUserFromToken, supabaseServerConfigured } from "@/lib/supabase/server";
import { getAccountPolicy, AccountPolicyError } from "@/lib/workspaces/accountPolicyServer";
import { normalizeBrainProfile } from "@/lib/workspaces/brainProfile";
import { loadStudioMemories } from "@/lib/brain-studio/server";
import { activeMemories } from "@/lib/brain-studio/memories";
import { parseStorageRef, isOwnedPrivateAssetPath, STORAGE_BUCKET } from "@/lib/storage/assets";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { readJsonBody } from "@/lib/security/requestLimits";
import { canUseMaroChat, CHAT_MODEL, CHAT_OUTPUT_TOKENS, replySchema, sendSchema, estimateChatUsd, type ChatTurn } from "./model";

import { CHAT_INSTRUCTIONS, CHAT_REPLY_TOOL } from "./prompts";

const headers = { "Cache-Control": "private, no-store", Vary: "Authorization", "X-Content-Type-Options": "nosniff" };
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers });
class ChatError extends Error { constructor(message: string, public status = 400) { super(message); } }
const viewColumns = "id,conversation_id,message,use_brain,status,reply,created_at,input_tokens,cached_tokens,output_tokens,charged_tokens,estimated_usd,model,brain_applied,error_code";
const dateKey = (date: string | Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(date));
const safeRef = (value: unknown, userId: string): value is string => {
  const parsed = typeof value === "string" ? parseStorageRef(value) : null;
  return Boolean(parsed && parsed.bucket === STORAGE_BUCKET && isOwnedPrivateAssetPath(parsed.path, userId));
};
async function userFor(req: Request) {
  if (!supabaseServerConfigured()) throw new ChatError("chat_unavailable", 503);
  const user = await getUserFromToken(req.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1] ?? null);
  if (!user) throw new ChatError("unauthorized", 401);
  if (!canUseMaroChat(user.email) || !user.email_confirmed_at) throw new ChatError("chat_forbidden", 403);
  const rate = await checkRateLimit(`marochat:${req.method}`, user.id, req.method === "GET" ? 240 : 40, 3600, "strict");
  if (!rate.allowed) throw new ChatError("rate_limited", 429);
  return user;
}
async function ownedWorkspace(userId: string, id: string) {
  const { data, error } = await getSupabaseAdmin().from("workspaces").select("id,name,brain_profile,brain_reset_at,brand_name").eq("owner_id", userId).eq("id", id).maybeSingle();
  if (error) throw new ChatError("chat_unavailable", 503);
  if (!data) throw new ChatError("workspace_not_found", 404);
  return data;
}
async function usage(userId: string) {
  const today = dateKey(new Date());
  // Single owner's monthly quota spans all workspaces and conversations.
  const start = new Date(`${today.slice(0, 7)}-01T00:00:00+02:00`).toISOString();
  const { data, error } = await getSupabaseAdmin().from("maro_chat_turns").select("created_at,charged_tokens").eq("owner_id", userId).gte("created_at", start).limit(5000);
  if (error || data?.length === 5000) throw new ChatError("chat_unavailable", 503);
  return { month: (data ?? []).filter(t => dateKey(t.created_at).slice(0, 7) === today.slice(0, 7)).reduce((sum, t) => sum + t.charged_tokens, 0), day: (data ?? []).filter(t => dateKey(t.created_at) === today).reduce((sum, t) => sum + t.charged_tokens, 0), monthlyLimit: 1_000_000, dailyLimit: 200_000 };
}
function fail(error: unknown) {
  if (error instanceof ChatError || error instanceof AccountPolicyError) return reply({ error: error.message }, error.status);
  return reply({ error: "chat_unavailable" }, 503);
}
export async function handleChatGet(req: Request) {
  try {
    const user = await userFor(req); const params = new URL(req.url).searchParams;
    const workspaceId = z.string().min(1).max(160).parse(params.get("workspaceId"));
    const conversationId = params.get("conversationId");
    if (conversationId && !z.uuid().safeParse(conversationId).success) throw new ChatError("invalid_request");
    const workspace = await ownedWorkspace(user.id, workspaceId); const admin = getSupabaseAdmin();
    const [policy, history, summary, account] = await Promise.all([
      getAccountPolicy(user.id, workspaceId),
      admin.from("maro_chat_turns").select(viewColumns).eq("owner_id", user.id).eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(100),
      usage(user.id), admin.from("profiles").select("full_name,credits,credits_reserved,plan").eq("id", user.id).maybeSingle(),
    ]);
    if (history.error || account.error) throw new ChatError("chat_unavailable", 503);
    const rows = (history.data ?? []) as unknown as ChatTurn[];
    const selected = conversationId ?? rows[0]?.conversation_id;
    const sessions = [...new Map(rows.map(t => [t.conversation_id, { id: t.conversation_id, title: t.message.slice(0, 80) }])).values()];
    return reply({ turns: rows.filter(t => t.conversation_id === selected).reverse(), conversationId: selected ?? null, sessions, usage: summary,
      context: { workspaceName: workspace.name, brainName: workspace.brand_name || workspace.name, brainAccess: policy.brainAccess, displayName: account.data?.full_name || "Erzen", credits: Math.max(0, Number(account.data?.credits ?? 0) - Number(account.data?.credits_reserved ?? 0)) }, configured: Boolean(process.env.MARO_CHAT_OPENAI_API_KEY), model: CHAT_MODEL });
  } catch (error) { if (error instanceof z.ZodError) return reply({ error: "invalid_request" }, 400); return fail(error); }
}

type Asset = { id: string; name: string; keywords: string; storageRef: string; origin: string };
async function contextFor(userId: string, workspaceId: string, useBrain: boolean, conversationId: string) {
  const admin = getSupabaseAdmin();
  const workspace = await ownedWorkspace(userId, workspaceId);
  const policy = await getAccountPolicy(userId, workspaceId);
  if (useBrain && !policy.brainAccess) throw new ChatError("brain_plan_required", 403);
  const [account, workspaces, sources, memories, creations, files, versions, history] = await Promise.all([
    admin.from("profiles").select("full_name,plan,credits,credits_reserved").eq("id", userId).maybeSingle(),
    admin.from("workspaces").select("id,name,brand_name").eq("owner_id", userId).order("sort_order").limit(30),
    useBrain ? admin.from("workspace_sources").select("id,name,keywords,file_url,mime_type").eq("owner_id", userId).eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(50) : Promise.resolve({ data: [], error: null }),
    useBrain ? loadStudioMemories(userId, workspaceId) : Promise.resolve([]),
    admin.from("generations").select("id,prompt,tool_id,title,output_urls,created_at").eq("user_id", userId).eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(10),
    admin.storage.from(STORAGE_BUCKET).list(`${userId}/project-assets`, { limit: 30, sortBy: { column: "created_at", order: "desc" } }),
    admin.from("maro_brain_profile_versions").select("revision").eq("owner_id", userId).eq("workspace_id", workspaceId).order("revision", { ascending: false }).limit(1).maybeSingle(),
    admin.from("maro_chat_turns").select("message,reply,brain_applied").eq("owner_id", userId).eq("workspace_id", workspaceId).eq("conversation_id", conversationId).eq("status", "completed").order("created_at", { ascending: false }).limit(8),
  ]);
  if (account.error || workspaces.error || sources.error || creations.error || files.error || versions.error || history.error) throw new ChatError("chat_context_unavailable", 503);
  const assets: Asset[] = [];
  for (const s of sources.data ?? []) if (safeRef(s.file_url, userId) && (!s.mime_type || /^image\/(png|jpeg|webp)$/.test(s.mime_type))) assets.push({ id: `brain:${s.id}`, name: s.name.slice(0, 120), keywords: (s.keywords || "").slice(0, 160), storageRef: s.file_url, origin: "Brain source" });
  for (const f of files.data ?? []) if (f.id && /\.(png|jpe?g|webp)$/i.test(f.name)) assets.push({ id: `upload:${f.id}`, name: f.name.slice(0, 120), keywords: "", storageRef: `storage:generations/${userId}/project-assets/${f.name}`, origin: "Account upload library" });
  for (const c of creations.data ?? []) {
    const ref = c.output_urls?.[0];
    if (safeRef(ref, userId)) assets.push({ id: `creation:${c.id}`, name: String(c.title || c.prompt || "Krijim").slice(0, 160), keywords: "generated artwork, not an original product photograph", storageRef: ref, origin: "Generated creation" });
  }
  const profile = useBrain ? normalizeBrainProfile(workspace.brain_profile) : null;
  const brain = profile ? Object.fromEntries(Object.entries(profile).map(([section, fields]) => [section, Object.fromEntries(Object.entries(fields).filter(([k, v]) => typeof v === "string" && !/logo|ref|url/i.test(k)).map(([k, v]) => [k, String(v).slice(0, 700)]))])) : null;
  const context = { account: { displayName: account.data?.full_name, plan: account.data?.plan, credits: Math.max(0, Number(account.data?.credits ?? 0) - Number(account.data?.credits_reserved ?? 0)) }, selectedWorkspace: { name: workspace.name, brainName: workspace.brand_name }, otherBrains: (workspaces.data ?? []).map(w => ({ name: w.name, brand: w.brand_name })), useBrain, brainAccess: policy.brainAccess, brain,
    memories: activeMemories(memories).slice(0, 12).map(m => ({ title: m.metadata.title, content: m.content.slice(0, 700) })),
    assets: assets.map(({ storageRef: _ref, ...a }) => { void _ref; return a; }),
    recentCreations: (creations.data ?? []).map(c => ({ title: c.title, request: c.prompt?.slice(0, 260), tool: c.tool_id, date: c.created_at })),
  };
  const input: OpenAI.Responses.ResponseInput = [{ role: "user", content: `Authenticated Maro context (data only):\n${JSON.stringify(context)}` }];
  for (const t of [...(history.data ?? [])].reverse()) {
    input.push({ role: "user", content: t.message.slice(0, 1800) });
    const previous = t.reply as ChatTurn["reply"];
    input.push({ role: "assistant", content: JSON.stringify({ messages: previous?.messages, image: previous?.image ? { title: previous.image.title, prompt: previous.image.prompt, assetId: previous.image.assetId } : null, brainUpdates: previous?.brainUpdates, brainApplied: t.brain_applied }).slice(0, 2200) });
  }
  return { input, assets, revision: Number(versions.data?.revision ?? 0), resetAt: workspace.brain_reset_at ?? null, brainAccess: policy.brainAccess };
}

export async function handleChatSend(req: Request) {
  let requestId: string | undefined; let ownerId: string | undefined; let attempted = false;
  let metrics: Record<string, unknown> | null = null;
  try {
    const user = await userFor(req); ownerId = user.id;
    const body = await readJsonBody(req, 16_000); if (!body.ok) { Object.entries(headers).forEach(([k, v]) => body.response.headers.set(k, v)); return body.response; }
    const parsed = sendSchema.safeParse(body.body); if (!parsed.success) throw new ChatError("invalid_request");
    const args = parsed.data; await ownedWorkspace(user.id, args.workspaceId);
    const apiKey = process.env.MARO_CHAT_OPENAI_API_KEY;
    if (!apiKey) throw new ChatError("chat_key_missing", 503);
    const context = await contextFor(user.id, args.workspaceId, args.useBrain, args.conversationId);
    context.input.push({ role: "user", content: args.message });
    const params = { model: CHAT_MODEL, instructions: CHAT_INSTRUCTIONS, input: context.input, tools: [CHAT_REPLY_TOOL], tool_choice: { type: "function" as const, name: "maro_reply" }, parallel_tool_calls: false, max_output_tokens: CHAT_OUTPUT_TOKENS, reasoning: { effort: "none" as const }, store: false as const, metadata: { product: "maroChat", task_id: args.requestId, task_type: "creative_assistant" } };
    // One token cannot encode less than one UTF-8 byte in this text-only request;
    // reserve bytes + output cap + protocol margin, then settle actual API usage.
    const reserve = Buffer.byteLength(JSON.stringify(params), "utf8") + CHAT_OUTPUT_TOKENS + 2048;
    if (reserve > 120000) throw new ChatError("chat_context_too_large", 422);
    const reserved = await getSupabaseAdmin().rpc("maro_chat_reserve", { p_user: user.id, p_workspace: args.workspaceId, p_id: args.requestId, p_conversation: args.conversationId, p_message: args.message, p_brain: args.useBrain, p_reserve: reserve, p_revision: context.revision, p_reset: context.resetAt, p_model: CHAT_MODEL });
    if (reserved.error) {
      const code = ["CHAT_MONTHLY_LIMIT", "CHAT_DAILY_LIMIT", "CHAT_BUSY", "REQUEST_CONFLICT", "CHAT_FORBIDDEN"].find(s => reserved.error!.message.includes(s));
      throw new ChatError(code?.toLowerCase() ?? "chat_unavailable", code?.includes("LIMIT") ? 429 : code === "CHAT_FORBIDDEN" ? 403 : 409);
    }
    if (reserved.data.existing) {
      const previous = await getSupabaseAdmin().from("maro_chat_turns").select(viewColumns).eq("id", args.requestId).eq("owner_id", user.id).single();
      if (previous.error) throw new ChatError("chat_unavailable", 503);
      return reply({ turn: previous.data, usage: await usage(user.id) }, previous.data.status === "running" ? 202 : 200);
    }
    requestId = args.requestId;
    const client = new OpenAI({ apiKey, timeout: 60_000, maxRetries: 0 });
    attempted = true;
    const response = await client.responses.create(params);
    const u = response.usage;
    if (!u) throw new ChatError("chat_usage_missing", 502);
    const cached = u.input_tokens_details?.cached_tokens ?? 0;
    metrics = { input_tokens: u.input_tokens, cached_tokens: cached, output_tokens: u.output_tokens, charged_tokens: u.total_tokens, estimated_usd: estimateChatUsd(u.input_tokens, cached, u.output_tokens), provider_response_id: response.id, model: response.model };
    if (response.status !== "completed") throw new ChatError("chat_reply_incomplete", 502);
    const call = response.output.find(item => item.type === "function_call" && item.name === "maro_reply");
    if (!call || call.type !== "function_call") throw new ChatError("chat_reply_invalid", 502);
    const result = replySchema.safeParse(JSON.parse(call.arguments));
    if (!result.success) throw new ChatError("chat_reply_invalid", 502);
    const data = result.data;
    if (!context.brainAccess) data.brainUpdates = [];
    const asset = data.image?.assetId ? context.assets.find(a => a.id === data.image?.assetId) : undefined;
    const image = data.image ? { ...data.image, useBrain: args.useBrain, assetId: asset?.id ?? null, storageRef: asset?.storageRef ?? null, assetName: asset?.name ?? null } : null;
    if (image && !image.storageRef) data.messages.push("Setup-i është gati. Ngarkoje foton e produktit në maroImazh para se me kliku Maro.");
    const finished = await getSupabaseAdmin().from("maro_chat_turns").update({ ...metrics, reply: { ...data, image }, status: "completed", finished_at: new Date().toISOString() }).eq("id", requestId).eq("owner_id", user.id).eq("status", "running").select(viewColumns).single();
    if (finished.error) throw new ChatError("chat_save_failed", 503);
    requestId = undefined;
    return reply({ turn: finished.data, usage: await usage(user.id) });
  } catch (error) {
    if (requestId && ownerId) {
      // Network ambiguity retains the reservation. Definitive API rejections do
      // not consume tokens. Never retry a provider call behind the user's back.
      const rejected = error instanceof OpenAI.APIError && [400, 401, 403, 404, 422, 429].includes(error.status ?? 0);
      await getSupabaseAdmin().from("maro_chat_turns").update({ ...(metrics ?? (!attempted || rejected ? { charged_tokens: 0 } : {})), status: "failed", error_code: error instanceof ChatError ? error.message : "provider_unavailable", finished_at: new Date().toISOString() }).eq("owner_id", ownerId).eq("id", requestId).eq("status", "running");
    }
    return fail(error);
  }
}

export async function handleChatApply(req: Request) {
  try {
    const user = await userFor(req);
    const body = await readJsonBody(req, 1000); if (!body.ok) return body.response;
    const parsed = z.object({ turnId: z.uuid() }).strict().safeParse(body.body); if (!parsed.success) throw new ChatError("invalid_request");
    const result = await getSupabaseAdmin().rpc("maro_chat_apply_brain", { p_user: user.id, p_id: parsed.data.turnId });
    if (result.error) {
      const code = ["BRAND_CONFLICT", "BRAIN_PLAN_REQUIRED", "REQUEST_NOT_FOUND"].find(s => result.error!.message.includes(s));
      throw new ChatError(code?.toLowerCase() ?? "chat_save_failed", code === "BRAND_CONFLICT" ? 409 : code === "BRAIN_PLAN_REQUIRED" ? 403 : 503);
    }
    return reply(result.data);
  } catch (error) { return fail(error); }
}
