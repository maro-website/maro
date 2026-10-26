import "server-only";
import { createHash, randomBytes } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { buildPublicUrl } from "@/lib/config/appOrigin";
import { readJsonBody } from "@/lib/security/requestLimits";
import { marketingUser, marketingWorkspace, ownedMarketingCampaign, ownedMarketingAsset, MarketingError, marketingResponse, marketingFailure } from "./server";
import { platforms, platformNames, type SocialAccount, type SocialPlatform } from "./model";

const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const workspaceId = z.string().min(1).max(160);
const socialAction = z.discriminatedUnion("action", [
  z.object({ action: z.literal("connect"), workspaceId, platform: z.enum(platforms) }).strict(),
  z.object({ action: z.literal("disconnect"), workspaceId, accountId: objectId }).strict(),
  z.object({ action: z.literal("creator"), workspaceId, accountId: objectId }).strict(),
  z.object({ action: z.literal("refresh"), workspaceId, publicationId: z.uuid() }).strict(),
  z.object({ action: z.literal("recover"), workspaceId, publicationId: z.uuid() }).strict(),
  z.object({ action: z.literal("cancel"), workspaceId, publicationId: z.uuid() }).strict(),
  z.object({ action: z.literal("publish"), workspaceId, campaignId: z.uuid(), revision: z.number().int().min(0), postId: z.uuid(), accountId: objectId, consent: z.literal(true), scheduledFor: z.iso.datetime({ offset: true }).nullable(),
    tiktok: z.object({ privacy: z.enum(["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "FOLLOWER_OF_CREATOR", "SELF_ONLY"]), comments: z.boolean(), commercial: z.enum(["none", "brand_organic", "brand_content"]), musicConsent: z.literal(true) }).strict().optional(),
  }).strict(),
]);
type ProviderProfile = { _id: string; externalId?: string };
type ProviderAccount = { _id: string; platform: string; profileId: string | { _id: string }; username?: string; displayName?: string; isActive?: boolean };
type ProviderPost = { _id: string; status: string; platforms?: { accountId?: string | { _id: string }; platform: string; status?: string; platformPostUrl?: string; error?: unknown }[]; metadata?: { maroPublicationId?: string } };
export class SocialApiError extends MarketingError { constructor(public providerStatus: number) { super(providerStatus === 402 ? "social_payment_required" : providerStatus === 401 || providerStatus === 403 ? "social_access_required" : providerStatus === 429 ? "social_rate_limited" : "social_provider_failed", providerStatus === 429 ? 429 : 503); } }
export async function socialApi<T>(path: string, body?: unknown, method = "POST", idempotency?: string): Promise<T> {
  const key = process.env.MARO_MARKETING_ZERNIO_API_KEY;
  if (!key) throw new MarketingError("social_key_missing", 503);
  // Fixed provider origin: no user-controlled fetch destination or client-visible API key.
  const response = await fetch("https://zernio.com/api/v1" + path, { method: body === undefined && method === "POST" ? "GET" : method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(idempotency ? { "Idempotency-Key": idempotency } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(90_000) });
  if (!response.ok) throw new SocialApiError(response.status);
  return await response.json() as T;
}
async function profileFor(userId: string, wsId: string, create = false) {
  const db = getSupabaseAdmin();
  const row = await db.from("maro_marketing_social_profiles").select("provider_id").eq("owner_id", userId).eq("workspace_id", wsId).maybeSingle();
  if (row.error) throw new MarketingError("marketing_unavailable", 503);
  if (row.data?.provider_id || !create) return row.data?.provider_id as string | undefined;
  const externalId = "maro:" + createHash("sha256").update(`${userId}:${wsId}`).digest("hex").slice(0, 32);
  let profile: ProviderProfile | undefined;
  try { profile = (await socialApi<{ profile: ProviderProfile }>("/profiles", { name: `Maro Brain ${externalId.slice(5, 21)}`, externalId, timezone: "Europe/Berlin" }, "POST", externalId)).profile; }
  catch (error) {
    if (!(error instanceof SocialApiError) || error.providerStatus !== 409) throw error;
    profile = (await socialApi<{ profiles: ProviderProfile[] }>("/profiles?externalId=" + encodeURIComponent(externalId))).profiles.find(p => p.externalId === externalId);
  }
  const id = objectId.parse(profile?._id);
  const saved = await db.from("maro_marketing_social_profiles").upsert({ owner_id: userId, workspace_id: wsId, provider_id: id }, { onConflict: "workspace_id" });
  if (saved.error) throw new MarketingError("marketing_unavailable", 503);
  return id;
}
async function accountsFor(userId: string, wsId: string): Promise<SocialAccount[]> {
  const profile = await profileFor(userId, wsId); if (!profile) return [];
  const data = await socialApi<{ accounts: ProviderAccount[] }>("/accounts?profileId=" + encodeURIComponent(profile));
  return data.accounts.filter(a => (typeof a.profileId === "string" ? a.profileId : a.profileId?._id) === profile && platforms.includes(a.platform as SocialPlatform) && objectId.safeParse(a._id).success).map(a => ({ id: a._id, platform: a.platform as SocialPlatform, name: (a.displayName || a.username || platformNames[a.platform as SocialPlatform]).slice(0, 180), username: (a.username || "").slice(0, 180), active: a.isActive === true }));
}
async function accountFor(userId: string, wsId: string, id: string) {
  const account = (await accountsFor(userId, wsId)).find(a => a.id === id);
  if (!account) throw new MarketingError("social_account_not_found", 404);
  return account;
}
const publicationColumns = "id,campaign_id,post_id,platform,account_name,status,provider_id,url,scheduled_for,created_at,error_code";
function safeLink(value: unknown) { try { const u = new URL(String(value)); return u.protocol === "https:" && !u.username && !u.password ? u.href : null; } catch { return null; } }
async function ownedPublication(userId: string, wsId: string, id: string) {
  const result = await getSupabaseAdmin().from("maro_marketing_publications").select("*").eq("owner_id", userId).eq("workspace_id", wsId).eq("id", id).maybeSingle();
  if (result.error) throw new MarketingError("marketing_unavailable", 503);
  if (!result.data) throw new MarketingError("publication_not_found", 404);
  return result.data;
}
async function updatePublication(userId: string, id: string, value: Record<string, unknown>) {
  const result = await getSupabaseAdmin().from("maro_marketing_publications").update(value).eq("id", id).eq("owner_id", userId).select(publicationColumns).single();
  if (result.error) throw new MarketingError("publication_status_unknown", 503);
  return result.data;
}
function providerResult(post: ProviderPost, platform: string, accountId: string) {
  const entry = post.platforms?.find(p => p.platform === platform && (typeof p.accountId === "string" ? p.accountId : p.accountId?._id) === accountId);
  // A scheduled post has a pending platform entry until its send time. Keep the schedule actionable.
  const status = ["scheduled", "draft", "pending_approval"].includes(post.status) ? post.status : entry?.status || post.status;
  const known = ["draft", "scheduled", "pending", "publishing", "published", "failed", "partial", "cancelled", "pending_approval"];
  return { provider_id: objectId.parse(post._id), status: platform === "tiktok" && ["published", "draft"].includes(status) ? "awaiting_tiktok" : known.includes(status) ? status : "unknown", url: safeLink(entry?.platformPostUrl), error_code: entry?.error ? "platform_rejected" : null };
}
export type TikTokCreator = { creator: { nickname: string; canPostMore: boolean }; privacyLevels: { value: string; label: string }[]; postingLimits: { interactionSettings: { allow_comment?: { enabled: boolean } } }; commercialContentTypes: { value: string; label: string }[] };
async function creatorFor(accountId: string) { return socialApi<TikTokCreator>(`/accounts/${objectId.parse(accountId)}/tiktok/creator-info?mediaType=photo`); }
export async function handleSocialGet(req: Request) {
  try {
    const user = await marketingUser(req), wsId = workspaceId.parse(new URL(req.url).searchParams.get("workspaceId"));
    await marketingWorkspace(user.id, wsId);
    const configured = Boolean(process.env.MARO_MARKETING_ZERNIO_API_KEY);
    const [accounts, pubs] = await Promise.all([configured ? accountsFor(user.id, wsId) : Promise.resolve([]), getSupabaseAdmin().from("maro_marketing_publications").select(publicationColumns).eq("owner_id", user.id).eq("workspace_id", wsId).order("created_at", { ascending: false }).limit(100)]);
    if (pubs.error) throw new MarketingError("marketing_unavailable", 503);
    return marketingResponse({ configured, accounts, publications: pubs.data ?? [] });
  } catch (error) { return marketingFailure(error); }
}
export async function handleSocialPost(req: Request) {
  let sending: { ownerId: string; id: string; recovery?: boolean } | null = null;
  try {
    const user = await marketingUser(req), body = await readJsonBody(req, 12000); if (!body.ok) return body.response;
    const args = socialAction.parse(body.body); await marketingWorkspace(user.id, args.workspaceId);
    if (!process.env.MARO_MARKETING_ZERNIO_API_KEY) throw new MarketingError("social_key_missing", 503);
    if (args.action === "connect") {
      if (["reddit", "snapchat"].includes(args.platform)) throw new MarketingError("social_platform_restricted", 409);
      const profileId = await profileFor(user.id, args.workspaceId, true);
      const params = new URLSearchParams({ profileId: profileId!, redirect_url: buildPublicUrl("/marketing", { tab: "socials" }) });
      if (!["bluesky", "telegram", "discord"].includes(args.platform)) params.set("scopes", "posting");
      if (args.platform === "instagram") params.set("forceReauth", "true");
      const result = await socialApi<{ authUrl: string }>(`/connect/${args.platform}?${params}`);
      const url = safeLink(result.authUrl); if (!url) throw new MarketingError("social_provider_failed", 503);
      return marketingResponse({ url });
    }
    if (args.action === "disconnect" || args.action === "creator") {
      const account = await accountFor(user.id, args.workspaceId, args.accountId);
      if (args.action === "creator") {
        if (account.platform !== "tiktok") throw new MarketingError("invalid_request");
        return marketingResponse(await creatorFor(account.id));
      }
      const pending = await getSupabaseAdmin().from("maro_marketing_publications").select("id").eq("owner_id", user.id).eq("workspace_id", args.workspaceId).eq("account_id", account.id).in("status", ["sending", "scheduled", "pending", "publishing", "unknown"]).limit(1);
      if (pending.error) throw new MarketingError("marketing_unavailable", 503);
      if (pending.data?.length) throw new MarketingError("social_has_pending_posts", 409);
      await socialApi(`/accounts/${account.id}`, undefined, "DELETE"); return marketingResponse({ disconnected: true });
    }
    if (args.action === "recover") {
      const publication = await ownedPublication(user.id, args.workspaceId, args.publicationId);
      // Provider idempotency lasts 24 hours. Never create a fresh post to recover an ambiguous send.
      if (publication.status !== "unknown" || publication.provider_id || Date.parse(publication.created_at) < Date.now() - 23 * 3600_000) throw new MarketingError("publication_status_unknown", 409);
      const claim = await getSupabaseAdmin().from("maro_marketing_publications").update({ status: "sending" }).eq("id", publication.id).eq("owner_id", user.id).eq("workspace_id", args.workspaceId).eq("status", "unknown").select("id").maybeSingle();
      if (claim.error || !claim.data) throw new MarketingError("publication_already_started", 409);
      sending = { ownerId: user.id, id: publication.id, recovery: true };
      const remote = (await socialApi<{ post: ProviderPost }>("/posts", publication.snapshot.payload, "POST", publication.id)).post;
      return marketingResponse({ publication: await updatePublication(user.id, publication.id, providerResult(remote, publication.platform, publication.account_id)) });
    }
    if (args.action === "refresh" || args.action === "cancel") {
      const publication = await ownedPublication(user.id, args.workspaceId, args.publicationId);
      if (!publication.provider_id) throw new MarketingError("publication_status_unknown", 409);
      const remote = (await socialApi<{ post: ProviderPost }>(`/posts/${objectId.parse(publication.provider_id)}`)).post;
      if (remote._id !== publication.provider_id) throw new MarketingError("publication_status_unknown", 503);
      if (args.action === "cancel") {
        if (remote.status !== "scheduled") throw new MarketingError("publication_not_scheduled", 409);
        await socialApi(`/posts/${objectId.parse(publication.provider_id)}`, undefined, "DELETE");
        return marketingResponse({ publication: await updatePublication(user.id, publication.id, { status: "cancelled", media_expires_at: new Date().toISOString(), error_code: null }) });
      }
      return marketingResponse({ publication: await updatePublication(user.id, publication.id, providerResult(remote, publication.platform, publication.account_id)) });
    }
    const campaign = await ownedMarketingCampaign(user.id, args.workspaceId, args.campaignId);
    if (campaign.status !== "completed" || campaign.revision !== args.revision) throw new MarketingError("campaign_conflict", 409);
    const post = campaign.plan?.posts.find(p => p.id === args.postId);
    if (!post || post.status !== "approved" || !post.assetRef) throw new MarketingError("post_review_required", 409);
    ownedMarketingAsset(post.assetRef, user.id);
    const account = await accountFor(user.id, args.workspaceId, args.accountId);
    if (!account.active || account.platform !== post.channel) throw new MarketingError("social_account_mismatch", 409);
    if (["youtube", "snapchat", "reddit"].includes(account.platform)) throw new MarketingError("social_format_required", 409);
    const content = [post.hook, post.caption, post.cta].filter(Boolean).join("\n\n");
    const limits: Partial<Record<SocialPlatform, number>> = { twitter: 280, bluesky: 300, threads: 500, instagram: 2200, telegram: 1024, googlebusiness: 1500, pinterest: 500, tiktok: 4000, linkedin: 3000 };
    if (content.length > (limits[account.platform] ?? 60000)) throw new MarketingError("social_caption_too_long");
    const scheduled = args.scheduledFor ? new Date(args.scheduledFor) : null;
    if (scheduled && (scheduled.valueOf() < Date.now() + 5 * 60_000 || scheduled.valueOf() > Date.now() + 60 * 86400_000)) throw new MarketingError("invalid_schedule");
    if (account.platform === "tiktok") {
      if (!args.tiktok || scheduled) throw new MarketingError("tiktok_review_required");
      const creator = await creatorFor(account.id);
      if (!creator.creator.canPostMore || !creator.privacyLevels.some(p => p.value === args.tiktok!.privacy) || !creator.commercialContentTypes.some(p => p.value === args.tiktok!.commercial) || (args.tiktok.comments && !creator.postingLimits.interactionSettings.allow_comment?.enabled)) throw new MarketingError("tiktok_review_required");
    }
    const db = getSupabaseAdmin();
    const existing = await db.from("maro_marketing_publications").select(publicationColumns).eq("owner_id", user.id).eq("campaign_id", campaign.id).eq("post_id", post.id).eq("account_id", account.id).neq("status", "cancelled").maybeSingle();
    if (existing.error) throw new MarketingError("marketing_unavailable", 503);
    if (existing.data) return marketingResponse({ publication: existing.data, existing: true });
    const token = randomBytes(32).toString("hex"), id = crypto.randomUUID();
    const mediaUrl = buildPublicUrl("/api/marketing/media/image.jpg", { token });
    const payload = { title: post.title, content, mediaItems: [{ type: "image", url: mediaUrl }], platforms: [{ platform: account.platform, accountId: account.id }],
      ...(scheduled ? { scheduledFor: scheduled.toISOString(), timezone: "Europe/Berlin" } : { publishNow: true }), metadata: { maroPublicationId: id },
      ...(account.platform === "tiktok" ? { tiktokSettings: { draft: true, media_type: "photo", privacy_level: args.tiktok!.privacy, allow_comment: args.tiktok!.comments, content_preview_confirmed: true, express_consent_given: true, commercialContentType: args.tiktok!.commercial, auto_add_music: false, description: content } } : {}),
    };
    const inserted = await db.from("maro_marketing_publications").insert({ id, owner_id: user.id, workspace_id: args.workspaceId, campaign_id: campaign.id, post_id: post.id, account_id: account.id, platform: account.platform, account_name: account.name,
      snapshot: { assetRef: post.assetRef, payload }, scheduled_for: scheduled?.toISOString() ?? null, media_token_hash: createHash("sha256").update(token).digest("hex"), media_expires_at: new Date((scheduled?.valueOf() ?? Date.now()) + 7 * 86400_000).toISOString() }).select("id").single();
    if (inserted.error) throw new MarketingError(inserted.error.code === "23505" ? "publication_already_started" : "marketing_unavailable", 409);
    sending = { ownerId: user.id, id };
    const remote = (await socialApi<{ post: ProviderPost }>("/posts", payload, "POST", id)).post;
    const result = providerResult(remote, account.platform, account.id);
    return marketingResponse({ publication: await updatePublication(user.id, id, result) });
  } catch (error) {
    if (sending) {
      const rejected = !sending.recovery && error instanceof SocialApiError && [400, 401, 402, 403, 422, 429].includes(error.providerStatus);
      await getSupabaseAdmin().from("maro_marketing_publications").update({ status: rejected ? "failed" : "unknown", error_code: rejected ? "platform_rejected" : "publication_status_unknown" }).eq("id", sending.id).eq("owner_id", sending.ownerId).eq("status", "sending");
    }
    return marketingFailure(error);
  }
}
export async function handleMarketingMedia(req: Request) {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" };
  try {
    const token = new URL(req.url).searchParams.get("token");
    if (!token || !/^[a-f\d]{64}$/.test(token)) return new Response(null, { status: 404, headers });
    const result = await getSupabaseAdmin().from("maro_marketing_publications").select("owner_id,snapshot,status,media_expires_at").eq("media_token_hash", createHash("sha256").update(token).digest("hex")).gt("media_expires_at", new Date().toISOString()).maybeSingle();
    if (result.error || !result.data || result.data.status === "cancelled") return new Response(null, { status: 404, headers });
    const asset = ownedMarketingAsset(result.data.snapshot.assetRef, result.data.owner_id);
    const downloaded = await getSupabaseAdmin().storage.from(asset.bucket).download(asset.path);
    if (downloaded.error || !downloaded.data || downloaded.data.size > 30_000_000) return new Response(null, { status: 404, headers });
    const bytes = await sharp(Buffer.from(await downloaded.data.arrayBuffer()), { limitInputPixels: 25_000_000 }).rotate().flatten({ background: "#ffffff" }).jpeg({ quality: 94 }).toBuffer();
    return new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Type": "image/jpeg", "Content-Length": String(bytes.length) } });
  } catch { return new Response(null, { status: 404, headers }); }
}
