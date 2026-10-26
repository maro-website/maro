import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin, getUserFromToken, supabaseServerConfigured, resolveAssetListForClient } from "@/lib/supabase/server";
import { getAccountPolicy, AccountPolicyError } from "@/lib/workspaces/accountPolicyServer";
import { normalizeBrainProfile, buildCompactBrainBrief } from "@/lib/workspaces/brainProfile";
import { loadStudioMemories } from "@/lib/brain-studio/server";
import { buildMemoryBrief, selectMemories } from "@/lib/brain-studio/memories";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { readJsonBody } from "@/lib/security/requestLimits";
import { parseStorageRef, isOwnedPrivateAssetPath } from "@/lib/storage/assets";
import { MARKETING_INSTRUCTIONS } from "./prompts";
import { canUseMarketing, MARKETING_MODEL, MARKETING_OUTPUT_TOKENS, MARKETING_DAILY_USD, MARKETING_MONTHLY_USD, createCampaignSchema, campaignActionSchema, generatedPlanSchema, assemblePlan, estimateMarketingUsd, localDate, type MarketingCampaign, type MarketingPlan } from "./model";

const headers = { "Cache-Control": "private, no-store", Vary: "Authorization", "X-Content-Type-Options": "nosniff" };
export const marketingResponse = (data: unknown, status = 200) => NextResponse.json(data, { status, headers });
export class MarketingError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function marketingFailure(error: unknown) {
  if (error instanceof MarketingError || error instanceof AccountPolicyError) return marketingResponse({ error: error.message }, error.status);
  if (error instanceof z.ZodError) return marketingResponse({ error: "invalid_request" }, 400);
  return marketingResponse({ error: "marketing_unavailable" }, 503);
}
export const campaignColumns = "id,workspace_id,brand,brief,plan,status,revision,created_at,estimated_usd,reserved_usd,input_tokens,cached_tokens,output_tokens,search_calls,model,error_code";
export async function marketingUser(req: Request) {
  if (!supabaseServerConfigured()) throw new MarketingError("marketing_unavailable", 503);
  const user = await getUserFromToken(req.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1] ?? null);
  if (!user) throw new MarketingError("unauthorized", 401);
  if (!canUseMarketing(user.email) || !user.email_confirmed_at) throw new MarketingError("marketing_forbidden", 403);
  const rate = await checkRateLimit(`maro-marketing:${req.method}`, user.id, req.method === "GET" ? 240 : 50, 3600, "strict");
  if (!rate.allowed) throw new MarketingError("rate_limited", 429);
  return user;
}
export async function marketingWorkspace(userId: string, workspaceId: string) {
  const { data, error } = await getSupabaseAdmin().from("workspaces").select("id,name,brand_name,brain_profile").eq("owner_id", userId).eq("id", workspaceId).maybeSingle();
  if (error) throw new MarketingError("marketing_unavailable", 503);
  if (!data) throw new MarketingError("workspace_not_found", 404);
  return data;
}
export async function ownedMarketingCampaign(userId: string, workspaceId: string, id: string): Promise<MarketingCampaign> {
  await marketingWorkspace(userId, workspaceId);
  const { data, error } = await getSupabaseAdmin().from("maro_marketing_campaigns").select(campaignColumns).eq("id", id).eq("owner_id", userId).eq("workspace_id", workspaceId).maybeSingle();
  if (error) throw new MarketingError("marketing_unavailable", 503);
  if (!data) throw new MarketingError("campaign_not_found", 404);
  const campaign = data as MarketingCampaign;
  if (campaign.status === "generating" && Date.parse(campaign.created_at) < Date.now() - 5 * 60_000) {
    const recovered = await getSupabaseAdmin().from("maro_marketing_campaigns").update({ status: "failed", error_code: "result_unknown" }).eq("id", id).eq("owner_id", userId).eq("workspace_id", workspaceId).eq("status", "generating").select(campaignColumns).maybeSingle();
    if (recovered.error) throw new MarketingError("marketing_unavailable", 503);
    if (recovered.data) return recovered.data as MarketingCampaign;
  }
  return campaign;
}
export function ownedMarketingAsset(ref: string, ownerId: string) {
  const parsed = parseStorageRef(ref);
  if (!parsed || parsed.bucket !== "generations" || !isOwnedPrivateAssetPath(parsed.path, ownerId)) throw new MarketingError("invalid_asset");
  return parsed;
}
export async function campaignView(campaign: MarketingCampaign, userId: string) {
  const posts = campaign.plan?.posts;
  if (!posts) return campaign;
  const refs = posts.map(p => { if (p.assetRef) ownedMarketingAsset(p.assetRef, userId); return p.assetRef ?? ""; });
  const urls = await resolveAssetListForClient(refs.filter(Boolean)); let i = 0;
  return { ...campaign, plan: { ...campaign.plan!, posts: posts.map((p, slot) => ({ ...p, assetUrl: refs[slot] ? urls[i++] || null : null })) } };
}
export async function handleMarketingGet(req: Request) {
  try {
    const user = await marketingUser(req), params = new URL(req.url).searchParams;
    const workspaceId = z.string().min(1).max(160).parse(params.get("workspaceId"));
    const ws = await marketingWorkspace(user.id, workspaceId);
    const campaignId = params.get("campaignId");
    if (campaignId) return marketingResponse({ campaign: await campaignView(await ownedMarketingCampaign(user.id, workspaceId, z.uuid().parse(campaignId)), user.id) });
    const today = localDate(), month = today.slice(0, 7);
    // Query only the current month plus a one-day UTC margin; filter Berlin dates below (DST-safe).
    const from = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)) - 1, 0)).toISOString();
    const [history, usage, policy, images] = await Promise.all([
      getSupabaseAdmin().from("maro_marketing_campaigns").select("id,brand,brief,status,created_at,estimated_usd").eq("owner_id", user.id).eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(60),
      getSupabaseAdmin().from("maro_marketing_campaigns").select("workspace_id,created_at,estimated_usd,reserved_usd,input_tokens,output_tokens,cached_tokens,search_calls,status").eq("owner_id", user.id).gte("created_at", from).limit(5000),
      getAccountPolicy(user.id, workspaceId),
      marketingImageUsage(user.id, workspaceId, from),
    ]);
    if (history.error || usage.error || usage.data?.length === 5000) throw new MarketingError("marketing_unavailable", 503);
    const rows = (usage.data ?? []).filter(r => localDate(new Date(r.created_at)).startsWith(month));
    const sum = (items: typeof rows, key: string) => items.reduce((n, r) => n + Number((r as Record<string, unknown>)[key] ?? 0), 0);
    const cost = (items: typeof rows) => items.reduce((n, r) => n + Number(r.estimated_usd ?? r.reserved_usd), 0);
    const current = rows.filter(r => r.workspace_id === workspaceId);
    const profile = normalizeBrainProfile(ws.brain_profile);
    return marketingResponse({ campaigns: history.data ?? [], configured: Boolean(process.env.MARO_MARKETING_OPENAI_API_KEY), socialsConfigured: Boolean(process.env.MARO_MARKETING_ZERNIO_API_KEY), model: MARKETING_MODEL,
      brain: { name: profile.brand.name || ws.brand_name || ws.name, description: profile.brand.description, audience: profile.target.audience, access: policy.brainAccess, ready: Boolean(profile.brand.name && profile.brand.description.length >= 8) },
      usage: { month: cost(rows), day: cost(rows.filter(r => localDate(new Date(r.created_at)) === today)), workspace: cost(current), estimated: sum(current, "estimated_usd"), uncertain: current.filter(r => r.estimated_usd === null).length, inputTokens: sum(current, "input_tokens"), outputTokens: sum(current, "output_tokens"), searches: sum(current, "search_calls"), campaigns: current.length, dailyLimit: MARKETING_DAILY_USD, monthlyLimit: MARKETING_MONTHLY_USD, monthKey: month, images },
    });
  } catch (error) { return marketingFailure(error); }
}
async function marketingImageUsage(userId: string, wsId: string, from: string) {
  const db = getSupabaseAdmin();
  const feeds = await db.from("maro_feeds").select("id").eq("owner_id", userId).eq("workspace_id", wsId).not("brief->marketing", "is", "null").limit(1000);
  if (feeds.error || feeds.data?.length === 1000) throw new MarketingError("marketing_unavailable", 503);
  if (!feeds.data?.length) return { count: 0, usd: 0, unknown: 0, credits: 0 };
  const attempts = await db.from("maro_feed_attempts").select("job_id,status,created_at").eq("owner_id", userId).in("feed_id", feeds.data.map(f => f.id)).gte("created_at", from).limit(5000);
  if (attempts.error || attempts.data?.length === 5000) throw new MarketingError("marketing_unavailable", 503);
  const month = localDate().slice(0, 7), rows = (attempts.data ?? []).filter(a => localDate(new Date(a.created_at)).startsWith(month));
  if (!rows.length) return { count: 0, usd: 0, unknown: 0, credits: 0 };
  const jobs = await db.from("generation_jobs").select("id,provider_cost_usd,credits_charged,status").eq("user_id", userId).in("id", rows.map(a => a.job_id)).limit(5000);
  if (jobs.error || jobs.data?.length === 5000) throw new MarketingError("marketing_unavailable", 503);
  return { count: rows.filter(a => a.status === "completed").length, usd: (jobs.data ?? []).reduce((s, j) => s + Number(j.provider_cost_usd ?? 0), 0), unknown: (jobs.data ?? []).filter(j => j.provider_cost_usd === null && j.status !== "pending" && j.status !== "reserved").length, credits: (jobs.data ?? []).reduce((s, j) => s + Number(j.credits_charged ?? 0), 0) };
}
export async function handleMarketingCreate(req: Request) {
  let started: { ownerId: string; id: string } | null = null;
  let metrics: Record<string, unknown> | null = null;
  try {
    const user = await marketingUser(req);
    const body = await readJsonBody(req, 16000); if (!body.ok) return body.response;
    const args = createCampaignSchema.parse(body.body), ws = await marketingWorkspace(user.id, args.workspaceId);
    const apiKey = process.env.MARO_MARKETING_OPENAI_API_KEY;
    if (!apiKey) throw new MarketingError("marketing_key_missing", 503);
    const today = localDate();
    if (args.brief.startDate < today || args.brief.startDate > `${Number(today.slice(0, 4)) + 1}${today.slice(4)}`) throw new MarketingError("invalid_start_date");
    const policy = await getAccountPolicy(user.id, args.workspaceId);
    if (!policy.brainAccess) throw new MarketingError("brain_plan_required", 403);
    const profile = normalizeBrainProfile(ws.brain_profile);
    if (!profile.brand.name || profile.brand.description.length < 8) throw new MarketingError("brain_incomplete");
    const memories = await loadStudioMemories(user.id, args.workspaceId);
    // Keep voice, exclusions, offering and evidence even when a very long description fills the context budget.
    const context = [buildCompactBrainBrief(profile), buildMemoryBrief(selectMemories(memories, args.brief.focus)).slice(0, 3000)].filter(Boolean).join("\n\n");
    const fingerprint = createHash("sha256").update(JSON.stringify({ workspaceId: args.workspaceId, brief: args.brief })).digest("hex");
    const reserved = await getSupabaseAdmin().rpc("maro_marketing_reserve", { p_user: user.id, p_workspace: args.workspaceId, p_id: args.requestId, p_fingerprint: fingerprint, p_brand: profile.brand.name, p_brief: args.brief, p_model: MARKETING_MODEL });
    if (reserved.error) { const code = ["REQUEST_CONFLICT", "MARKETING_BUSY", "MARKETING_DAILY_LIMIT", "MARKETING_MONTHLY_LIMIT"].find(c => reserved.error!.message.includes(c)); throw new MarketingError(code?.toLowerCase() ?? "marketing_unavailable", code?.includes("LIMIT") ? 429 : code ? 409 : 503); }
    if (reserved.data?.existing) return marketingResponse({ campaign: await campaignView(await ownedMarketingCampaign(user.id, args.workspaceId, args.requestId), user.id) });
    started = { ownerId: user.id, id: args.requestId };
    const input = JSON.stringify({ currentDate: today, timezone: "Europe/Berlin", brief: args.brief, brandContext: context, slots: Array.from({ length: 9 }, (_, i) => ({ number: i + 1, channel: args.brief.channels[i % args.brief.channels.length] })) });
    const client = new OpenAI({ apiKey, maxRetries: 0, timeout: 100_000 });
    const response = await client.responses.create({ model: MARKETING_MODEL, instructions: MARKETING_INSTRUCTIONS, input,
      text: { format: zodTextFormat(generatedPlanSchema, "marketing_plan") }, max_output_tokens: MARKETING_OUTPUT_TOKENS, reasoning: { effort: "low" },
      ...(args.brief.liveResearch ? { tools: [{ type: "web_search" as const, search_context_size: "low" as const }], tool_choice: "required" as const, max_tool_calls: 1, include: ["web_search_call.action.sources" as const] } : {}),
      parallel_tool_calls: false, store: false, metadata: { product: "maroMarketing", campaign_id: args.requestId, workspace_id: args.workspaceId } });
    const u = response.usage; const searches = response.output.filter(item => item.type === "web_search_call").length;
    if (u) metrics = { input_tokens: u.input_tokens, cached_tokens: u.input_tokens_details?.cached_tokens ?? 0, output_tokens: u.output_tokens, search_calls: searches, estimated_usd: estimateMarketingUsd(u.input_tokens, u.input_tokens_details?.cached_tokens ?? 0, u.output_tokens, searches), provider_response_id: response.id, model: response.model };
    if (!u || response.status !== "completed") throw new MarketingError("generation_incomplete", 503);
    const sources: MarketingPlan["sources"] = [];
    const addSource = (title: string, value: string) => { try { const url = new URL(value); if (url.protocol === "https:" && !url.username && !url.password && !sources.some(s => s.url === url.href)) sources.push({ title: (title || url.hostname).slice(0, 180), url: url.href }); } catch { /* Invalid source. */ } };
    for (const item of response.output) if (item.type === "web_search_call" && item.action.type === "search") for (const s of item.action.sources ?? []) addSource("", s.url);
    for (const item of response.output) if (item.type === "message") for (const content of item.content) if (content.type === "output_text") for (const a of content.annotations) if (a.type === "url_citation") {
      addSource(a.title, a.url);
    }
    if (args.brief.liveResearch && (!searches || !sources.length)) throw new MarketingError("research_unverified", 503);
    const generated = generatedPlanSchema.parse(JSON.parse(response.output_text));
    const plan = assemblePlan(generated, args.brief, sources.slice(0, 12));
    const saved = await getSupabaseAdmin().from("maro_marketing_campaigns").update({ plan, status: "completed", ...metrics }).eq("id", args.requestId).eq("owner_id", user.id).eq("status", "generating").select("id").maybeSingle();
    if (saved.error || !saved.data) throw new MarketingError("result_unknown", 503);
    return marketingResponse({ campaign: await campaignView(await ownedMarketingCampaign(user.id, args.workspaceId, args.requestId), user.id) });
  } catch (error) {
    if (started) {
      const rejected = error instanceof OpenAI.APIError && [400, 401, 403, 404, 429].includes(error.status ?? 0);
      await getSupabaseAdmin().from("maro_marketing_campaigns").update({ status: "failed", error_code: error instanceof MarketingError ? error.message : "generation_failed", ...(metrics ?? (rejected ? { estimated_usd: 0 } : {})) }).eq("id", started.id).eq("owner_id", started.ownerId).eq("status", "generating");
    }
    return marketingFailure(error);
  }
}
export async function handleMarketingAction(req: Request) {
  try {
    const user = await marketingUser(req), body = await readJsonBody(req, 20000); if (!body.ok) return body.response;
    const args = campaignActionSchema.parse(body.body);
    const campaign = await ownedMarketingCampaign(user.id, args.workspaceId, args.campaignId);
    if (campaign.status !== "completed" || !campaign.plan) throw new MarketingError("campaign_not_ready", 409);
    if (campaign.revision !== args.revision) throw new MarketingError("campaign_conflict", 409);
    let posts = campaign.plan.posts;
    if (args.action === "edit") {
      if (!posts.some(p => p.id === args.postId)) throw new MarketingError("post_not_found", 404);
      posts = posts.map(p => p.id === args.postId ? { ...p, ...args.post } : p);
    } else {
      const db = getSupabaseAdmin();
      const feed = await db.from("maro_feeds").select("id,brief,workspace_id").eq("id", args.feedId).eq("owner_id", user.id).eq("workspace_id", args.workspaceId).maybeSingle();
      if (feed.error) throw new MarketingError("marketing_unavailable", 503);
      if (!feed.data || Boolean(feed.data.brief.mobile) !== (args.studio === "apps") || feed.data.brief.marketing?.campaignId !== campaign.id) throw new MarketingError("feed_not_found", 404);
      const attempts = await db.from("maro_feed_attempts").select("slot,job_id,created_at").eq("feed_id", args.feedId).eq("owner_id", user.id).eq("status", "completed").order("created_at", { ascending: false }).limit(500);
      if (attempts.error || attempts.data?.length === 500) throw new MarketingError("marketing_unavailable", 503);
      if (!attempts.data?.length) throw new MarketingError("images_not_ready", 409);
      posts = posts.map(p => { const a = attempts.data.find(a => a.slot === p.slot); const ref = a ? `storage:generations/${user.id}/${a.job_id}/output.png` : null; return ref && ref !== p.assetRef ? { ...p, assetRef: ref, feedId: args.feedId, studio: args.studio, status: "draft" as const } : p; });
      if (posts.every((p, i) => p === campaign.plan!.posts[i])) return marketingResponse({ campaign: await campaignView(campaign, user.id) });
    }
    // Approval always refers to the exact saved copy + image. Imported/replaced images require review again.
    const result = await getSupabaseAdmin().from("maro_marketing_campaigns").update({ plan: { ...campaign.plan, posts }, revision: campaign.revision + 1 }).eq("id", campaign.id).eq("owner_id", user.id).eq("workspace_id", args.workspaceId).eq("revision", args.revision).select("id").maybeSingle();
    if (result.error) throw new MarketingError("marketing_unavailable", 503);
    if (!result.data) throw new MarketingError("campaign_conflict", 409);
    return marketingResponse({ campaign: await campaignView(await ownedMarketingCampaign(user.id, args.workspaceId, campaign.id), user.id) });
  } catch (error) { return marketingFailure(error); }
}
