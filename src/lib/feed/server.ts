import "server-only";
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getSupabaseAdmin, getUserFromToken, getWorkspaceBrainProfile, resolveAssetListForClient, supabaseServerConfigured } from "@/lib/supabase/server";
import { editImages, hasOpenAiKey } from "@/lib/ai/openai";
import type { ImageProviderObservation } from "@/lib/ai/imageObservation";
import { resolvePrivateImageReference } from "@/lib/ai/imageReferences";
import { imageOutputBytes } from "@/lib/generation/imageOutputFormat";
import { validateProviderImageBytes } from "@/lib/security/uploadValidation";
import { loadV1ImageModelRows, resolveV1ImageModel } from "@/lib/engine/v1ImageModels";
import { readJsonBody } from "@/lib/security/requestLimits";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { assertCircuitAllows } from "@/lib/security/circuitBreaker";
import { assertBudgetGuards } from "@/lib/operations/budgetGuards";
import { AccountPolicyError, requireBrainAccess, requireStorageSpace } from "@/lib/workspaces/accountPolicyServer";
import { buildBrainBrief } from "@/lib/workspaces/brainProfile";
import { loadStudioMemories } from "@/lib/brain-studio/server";
import { buildMemoryBrief, selectMemories } from "@/lib/brain-studio/memories";
import { optionalImageWork } from "@/lib/generation/v1ImagePersistence";
import { recordCompletedGenerationCosts } from "@/lib/generation/orchestrator";
import { actionFeedSchema, briefSchema, buildFeedPrompt, canUseFeed, configSchema, createFeedSchema, defaultConfig, feedRole, roles, type FeedContentType, type FeedBrief, type FeedCategory, type FeedConfig, type FeedView } from "./model";

const headers = { "Cache-Control": "no-store", Vary: "Authorization", "X-Content-Type-Options": "nosniff" };
export const feedResponse = (value: unknown, status = 200) => NextResponse.json(value, { status, headers });
class FeedError extends Error { constructor(public code: string, public status = 400) { super(code); } }
const knownErrors = ["feed_cancelled", "feed_not_found", "workspace_not_found", "feed_not_available", "feed_busy", "feed_not_complete", "slot_complete", "retry_limit", "insufficient_credits", "generation_paused", "rate_limited", "feed_refunded", "refund_unavailable", "platform_busy", "concurrency_limit", "ai_paused", "module_paused", "hourly_spend_limit", "daily_spend_limit", "user_hourly_spend_limit", "user_daily_spend_limit"];
export function feedError(error: unknown) {
  if (error instanceof FeedError) return feedResponse({ error: error.code }, error.status);
  if (error instanceof AccountPolicyError) return feedResponse({ error: error.message }, error.status);
  return feedResponse({ error: "feed_unavailable" }, 503);
}
async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await getSupabaseAdmin().rpc(name, args);
  if (error) { const code = knownErrors.find(c => error.message.includes(c)); throw new FeedError(code ?? "feed_unavailable", code === "insufficient_credits" ? 402 : code?.endsWith("not_found") ? 404 : code ? 409 : 503); }
  return data as T;
}
export async function feedUser(req: Request) {
  if (!supabaseServerConfigured()) throw new FeedError("feed_unavailable", 503);
  const user = await getUserFromToken(req.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1] ?? null);
  if (!user) throw new FeedError("unauthorized", 401);
  if (!canUseFeed(user.email) || !user.email_confirmed_at) throw new FeedError("feed_not_available", 404);
  const rate = await checkRateLimit("maro-feed", user.id, req.method === "GET" ? 360 : 90, 3600, "strict");
  if (!rate.allowed) throw new FeedError("rate_limited", 429);
  return user;
}
export async function loadFeedConfig(): Promise<{ config: FeedConfig; revision: number }> {
  const { data, error } = await getSupabaseAdmin().from("maro_feed_config").select("config,revision").eq("id", 1).maybeSingle();
  if (error) throw new FeedError("feed_unavailable", 503);
  return { config: data ? configSchema.parse(data.config) : defaultConfig, revision: data?.revision ?? 0 };
}
type FeedRow = { id: string; owner_id: string; workspace_id: string; reference: string; references_list: string[]; content_type: FeedContentType; text_mode: boolean; cancel_requested: boolean; cancelled_at: string | null; refund_credits: number; brief: FeedBrief; brain_context: string; config: FeedConfig; category: FeedCategory; free_used: number; refunded: boolean; created_at: string };
type Attempt = { id: string; feed_id: string; slot: number; job_id: string; status: string; feedback: string; regenerate: boolean; free_regen: boolean; generation_id: string | null; created_at: string; error: string | null };
export async function ownedFeed(userId: string, id: string): Promise<FeedRow> {
  const { data, error } = await getSupabaseAdmin().from("maro_feeds").select("*").eq("id", id).eq("owner_id", userId).maybeSingle();
  if (error) throw new FeedError("feed_unavailable", 503);
  if (!data) throw new FeedError("feed_not_found", 404);
  return data as FeedRow;
}
async function ownedWorkspace(userId: string, id: string) {
  const { data, error } = await getSupabaseAdmin().from("workspaces").select("id").eq("id", id).eq("owner_id", userId).maybeSingle();
  if (error) throw new FeedError("feed_unavailable", 503);
  if (!data) throw new FeedError("workspace_not_found", 404);
}
export async function feedView(userId: string, id: string): Promise<FeedView> {
  const f = await ownedFeed(userId, id);
  await rpc("maro_feed_recover", { p_user: userId, p_feed: id });
  const db = getSupabaseAdmin();
  const [state, attempts] = await Promise.all([
    db.from("maro_feeds").select("free_used,refunded,cancel_requested,cancelled_at,refund_credits").eq("id", id).eq("owner_id", userId).single(),
    db.from("maro_feed_attempts").select("id,feed_id,slot,job_id,status,feedback,regenerate,free_regen,generation_id,created_at,error").eq("feed_id", id).eq("owner_id", userId).order("created_at", { ascending: false }).limit(500),
  ]);
  if (state.error || attempts.error) throw new FeedError("feed_unavailable", 503);
  const rows = (attempts.data ?? []) as Attempt[];
  const latest = roles.map((_, slot) => rows.find(a => a.slot === slot && a.status === "completed"));
  const refs = latest.map(a => a ? `storage:generations/${userId}/${a.job_id}/output.png` : "");
  const signed = await resolveAssetListForClient(refs.filter(Boolean));
  let cursor = 0;
  const active = rows.find(a => a.status === "running");
  return { id, brand: f.brief.brand, category: f.category, createdAt: f.created_at, freeUsed: state.data.free_used, refunded: state.data.refunded,
    contentType: f.content_type ?? "mix", textMode: f.text_mode !== false, referenceCount: f.references_list?.length || 1,
    cancelRequested: state.data.cancel_requested, cancelled: Boolean(state.data.cancelled_at), refundCredits: state.data.refund_credits,
    tiles: roles.map((r, slot) => ({ slot, title: feedRole(slot, f.content_type ?? "mix").title, url: refs[slot] ? signed[cursor++] || null : null, version: rows.filter(a => a.slot === slot && a.status === "completed").length })),
    active: active ? { slot: active.slot, startedAt: active.created_at } : null, lastError: rows[0]?.status === "failed" ? rows[0].error : null };
}
async function generationReady(userId: string) {
  if (!hasOpenAiKey()) throw new FeedError("feed_unavailable", 503);
  await requireStorageSpace(userId);
  const circuit = await assertCircuitAllows("reklama");
  if (!circuit.ok) throw new FeedError(circuit.reason, 503);
  const budget = await assertBudgetGuards({ module: "reklama", toolId: "reklama", provider: "openai" });
  if (!budget.ok) throw new FeedError(budget.reason, 503);
  const { config } = await loadFeedConfig();
  if (!config.enabled) throw new FeedError("feed_paused", 503);
}
export async function handleFeedGet(req: Request) {
  try {
    const user = await feedUser(req); const url = new URL(req.url);
    const id = url.searchParams.get("feedId");
    if (id) { if (!/^[\da-f-]{36}$/i.test(id)) throw new FeedError("invalid_request"); return feedResponse({ feed: await feedView(user.id, id) }); }
    const workspaceId = url.searchParams.get("workspaceId");
    if (!workspaceId || workspaceId.length > 160) throw new FeedError("invalid_request");
    await ownedWorkspace(user.id, workspaceId);
    const { data, error } = await getSupabaseAdmin().from("maro_feeds").select("id,brief,created_at,refunded").eq("owner_id", user.id).eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(30);
    if (error) throw new FeedError("feed_unavailable", 503);
    return feedResponse({ feeds: (data ?? []).map(f => ({ id: f.id, brand: f.brief.brand, createdAt: f.created_at, refunded: f.refunded })) });
  } catch (error) { return feedError(error); }
}
export async function handleFeedCreate(req: Request) {
  try {
    const user = await feedUser(req);
    const body = await readJsonBody(req, 24000); if (!body.ok) return body.response;
    const parsed = createFeedSchema.safeParse(body.body); if (!parsed.success) throw new FeedError("invalid_request");
    const input = parsed.data;
    await ownedWorkspace(user.id, input.workspaceId);
    // Resolve before any charge: never silently generate without the uploaded product.
    const references = input.references ?? [input.reference!];
    for (const ref of references) await resolvePrivateImageReference(ref, user.id);
    await generationReady(user.id);
    const { config } = await loadFeedConfig();
    resolveV1ImageModel(await loadV1ImageModelRows("maro_imazh"), "maro_imazh", config.model);
    let brain = ""; let brief = input.brief;
    if (input.useBrain) {
      await requireBrainAccess(user.id, input.workspaceId);
      const profile = await getWorkspaceBrainProfile(user.id, input.workspaceId);
      if (!profile) throw new FeedError("brain_empty");
      const memories = await loadStudioMemories(user.id, input.workspaceId);
      brain = [buildBrainBrief(profile), buildMemoryBrief(selectMemories(memories, `${profile.brand.name} ${profile.brand.description} ${input.brief.notes ?? ""}`))].filter(Boolean).join("\n\n");
      if (brain.length > 24000) throw new FeedError("brain_too_large");
      brief = { brand: profile.brand.name, description: profile.brand.description, audience: profile.target.audience, goal: "sales", language: /english|anglisht|^en$/i.test(profile.brand.language) ? "en" : "sq", colors: (profile.brand.colors ?? []).join(", "), notes: "", ...Object.fromEntries(Object.entries(input.brief).filter(([, v]) => v !== "")) };
    }
    const resolved = briefSchema.safeParse({ audience: "", goal: "sales", language: "sq", colors: "", notes: "", ...brief });
    if (!resolved.success) throw new FeedError(input.useBrain ? "brain_incomplete" : "brief_incomplete");
    const id = await rpc<string>("maro_feed_create_v2", { p_user: user.id, p_workspace: input.workspaceId, p_request: input.requestId, p_references: references, p_content_type: input.contentType, p_text_mode: input.textMode, p_category: input.category, p_brief: resolved.data, p_context: brain, p_config: config });
    return feedResponse({ feed: await feedView(user.id, id) });
  } catch (error) { return feedError(error); }
}

export async function handleFeedAction(req: Request) {
  try {
    const user = await feedUser(req);
    const body = await readJsonBody(req, 4000); if (!body.ok) return body.response;
    const parsed = actionFeedSchema.safeParse(body.body); if (!parsed.success) throw new FeedError("invalid_request");
    const input = parsed.data;
    const f = await ownedFeed(user.id, input.feedId);
    const current = await feedView(user.id, f.id);
    if (input.action === "cancel" || input.action === "refund") {
      await rpc("maro_feed_cancel", { p_user: user.id, p_feed: f.id });
      return feedResponse({ feed: await feedView(user.id, f.id) });
    }
    if (current.cancelRequested || current.cancelled || current.refunded) throw new FeedError("feed_cancelled", 409);
    await generationReady(user.id);
    const slot = input.action === "next" ? current.tiles.find(t => !t.url)?.slot : input.slot;
    if (slot === undefined) return feedResponse({ feed: current });
    const model = resolveV1ImageModel(await loadV1ImageModelRows("maro_imazh"), "maro_imazh", f.config.model);
    const references = f.references_list?.length ? f.references_list : [f.reference];
    const products: Awaited<ReturnType<typeof resolvePrivateImageReference>>[] = [];
    for (const ref of references) products.push(await resolvePrivateImageReference(ref, user.id));
    const product = products[0];
    const images = products.map(item => item.dataUrl);
    // The first finished post becomes a visual style anchor; never a replacement product reference.
    if ((slot !== 0 || input.action === "regenerate") && current.tiles[0].url) {
      const { data, error } = await getSupabaseAdmin().from("maro_feed_attempts").select("job_id").eq("feed_id", f.id).eq("owner_id", user.id).eq("slot", 0).eq("status", "completed").order("created_at", { ascending: false }).limit(1).single();
      if (error || !data) throw new FeedError("feed_unavailable", 503);
      images.push((await resolvePrivateImageReference(`storage:generations/${user.id}/${data.job_id}/output.png`, user.id)).dataUrl);
    }
    const prompt = buildFeedPrompt({ config: f.config, brief: f.brief, category: f.category, slot, brain: f.brain_context, feedback: input.feedback,
      variant: current.tiles[slot].version + 1, hasStyleReference: images.length > products.length, referenceCount: products.length, contentType: f.content_type ?? "mix", textMode: f.text_mode !== false });
    const claimed = await rpc<{ claimed: boolean; attempt: Attempt }>("maro_feed_claim", { p_user: user.id, p_feed: f.id, p_request: input.requestId, p_slot: slot, p_regenerate: input.action === "regenerate", p_feedback: input.feedback ?? "", p_model: model.providerModelId });
    if (!claimed.claimed) return feedResponse({ feed: await feedView(user.id, f.id) });
    const a = claimed.attempt;
    const price = a.regenerate && !a.free_regen ? 5 : 0;
    let disconnected = false;
    const stream = new ReadableStream({ async start(controller) {
      const encoder = new TextEncoder();
      const send = (value: unknown) => { if (!disconnected) { try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(value)}\n\n`)); } catch { disconnected = true; } } };
      const heartbeat = setInterval(() => { if (!disconnected) { try { controller.enqueue(encoder.encode(": ping\n\n")); } catch { disconnected = true; } } }, 15000);
      let observation: ImageProviderObservation | undefined;
      try {
        send({ started: true, slot });
        const db = getSupabaseAdmin();
        const trace = await db.from("pricing_snapshots").insert({ job_id: a.job_id, user_id: user.id, kind: "generation", snapshot: { record_type: "maro_feed_execution", feedId: f.id, slot, prompt, promptHash: createHash("sha256").update(prompt).digest("hex"), model, productDigest: product.digest, productDigests: products.map(item => item.digest), referenceCount: images.length } });
        if (trace.error) throw new Error("trace_unavailable");
        const outputs = await editImages({ model: model.providerModelId, prompt, images, size: "1024x1024", quality: "high", n: 1,
          onObservation: async value => { observation = value; } });
        if (outputs.length !== 1) throw new Error("invalid_output");
        const validated = validateProviderImageBytes(outputs[0]); if (!validated.ok) throw new Error("invalid_output");
        const bytes = await imageOutputBytes(validated.bytes, "1:1");
        await requireStorageSpace(user.id, bytes.length);
        const path = `${user.id}/${a.job_id}/output.png`;
        const stored = await db.storage.from("generations").upload(path, bytes, { contentType: "image/png", upsert: false });
        if (stored.error) throw new Error("storage_failed");
        const verified = await db.storage.from("generations").download(path);
        if (verified.error || !verified.data || createHash("sha256").update(new Uint8Array(await verified.data.arrayBuffer())).digest("hex") !== createHash("sha256").update(bytes).digest("hex")) throw new Error("storage_failed");
        const generationId = await rpc<string>("maro_feed_finish", { p_attempt: a.id });
        await optionalImageWork("feed costs", () => recordCompletedGenerationCosts({ jobId: a.job_id, userId: user.id, module: "reklama", cost: price, model: model.providerModelId, provider: "openai", imageObservation: observation, generationId, imageCount: 1 }));
        send({ feed: await feedView(user.id, f.id) });
      } catch {
        // Recovery finishes a durably uploaded result before considering a refund.
        try {
          await rpc("maro_feed_recover", { p_user: user.id, p_feed: f.id, p_fail: a.id });
          const recovered = await feedView(user.id, f.id);
          send({ feed: recovered, ...(recovered.tiles[slot].version > current.tiles[slot].version ? {} : { error: "generation_failed" }) });
        }
        catch { send({ error: "recovery_pending" }); }
      } finally { clearInterval(heartbeat); if (!disconnected) { try { controller.close(); } catch { /* Navigation does not abort durable work. */ } } }
    }, cancel() { disconnected = true; } });
    return new Response(stream, { headers: { ...headers, "Content-Type": "text/event-stream; charset=utf-8", "X-Accel-Buffering": "no" } });
  } catch (error) { return feedError(error); }
}
