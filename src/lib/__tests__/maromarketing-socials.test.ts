import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import sharp from "sharp";
const m = vi.hoisted(() => ({ user: vi.fn(), from: vi.fn(), rate: vi.fn(), download: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getUserFromToken: m.user, supabaseServerConfigured: () => true, getSupabaseAdmin: () => ({ from: m.from, storage: { from: () => ({ download: m.download }) } }), resolveAssetListForClient: vi.fn() }));
vi.mock("@/lib/security/rateLimit", () => ({ checkRateLimit: m.rate }));
import { GET, POST } from "@/app/api/marketing/socials/route";
import { GET as media } from "@/app/api/marketing/media/image.jpg/route";
import { assemblePlan, type CampaignBrief } from "@/lib/marketing/model";
const owner = "11111111-1111-4111-8111-111111111111", other = "22222222-2222-4222-8222-222222222222";
const profile = "111111111111111111111111", foreignProfile = "222222222222222222222222", account = "333333333333333333333333", foreignAccount = "444444444444444444444444", remotePost = "555555555555555555555555";
const req = (body?: unknown) => new Request("https://maro.al/api/marketing/socials?workspaceId=ws", { method: body === undefined ? "GET" : "POST", headers: { Authorization: "Bearer synthetic", "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
type Row = Record<string, unknown>;
let tables: Record<string, Row[]>;
let accountPlatform = "instagram";
const remoteCalls: { url: string; method: string; body: Row | null; headers: Headers }[] = [];
const makeArgs = () => {
  const c = tables.maro_marketing_campaigns[0];
  return { action: "publish", workspaceId: "ws", campaignId: c.id, postId: (c.plan as { posts: { id: string }[] }).posts[0].id, revision: 0, accountId: account, consent: true, scheduledFor: null };
};
beforeEach(async () => {
  vi.clearAllMocks(); remoteCalls.length = 0; accountPlatform = "instagram"; process.env.MARO_MARKETING_ZERNIO_API_KEY = "synthetic-social-key"; process.env.APP_ORIGIN = "https://maro.al";
  m.user.mockResolvedValue({ id: owner, email: "erzen@nice.al", email_confirmed_at: "2026-10-26" }); m.rate.mockResolvedValue({ allowed: true });
  const brief: CampaignBrief = { title: "Launch", focus: "An actual useful product", offer: "", goal: "launch", language: "sq", startDate: "2026-10-26", days: 30, channels: ["instagram"], liveResearch: false };
  const plan = assemblePlan({ strategy: "A real campaign with useful customer stories", researchNote: "", posts: Array.from({ length: 9 }, () => ({ title: "Product", hook: "A real benefit", caption: "Our real product", cta: "Discover", visual: "Exact product photograph in a composed set", purpose: "Trust", metric: "Saves" })) }, brief, []);
  plan.posts[0] = { ...plan.posts[0], status: "approved", assetRef: `storage:generations/${owner}/job/output.png` };
  tables = { workspaces: [{ id: "ws", owner_id: owner, name: "Brain A" }, { id: "foreign", owner_id: other, name: "Brain B" }], maro_marketing_social_profiles: [{ owner_id: owner, workspace_id: "ws", provider_id: profile }], maro_marketing_campaigns: [{ id: crypto.randomUUID(), owner_id: owner, workspace_id: "ws", brand: "Brain A", brief, plan, revision: 0, status: "completed", created_at: new Date().toISOString() }], maro_marketing_publications: [] };
  m.from.mockImplementation((table: string) => {
    const filters: ((row: Row) => boolean)[] = []; let update: Row | null = null, insert: Row | null = null;
    const q: Record<string, unknown> = {};
    for (const name of ["select", "order", "limit"]) q[name] = vi.fn(() => q);
    q.eq = vi.fn((key: string, value: unknown) => { filters.push(r => r[key] === value); return q; });
    q.neq = vi.fn((key: string, value: unknown) => { filters.push(r => r[key] !== value); return q; });
    q.gt = vi.fn((key: string, value: string) => { filters.push(r => String(r[key]) > value); return q; });
    q.in = vi.fn((key: string, values: unknown[]) => { filters.push(r => values.includes(r[key])); return q; });
    q.update = vi.fn((v: Row) => { update = v; return q; }); q.insert = q.upsert = vi.fn((v: Row) => { insert = v; return q; });
    const execute = () => {
      if (insert) { tables[table] ??= []; if (table === "maro_marketing_publications") insert = { status: "sending", created_at: new Date().toISOString(), ...insert }; tables[table].push(insert); const inserted = insert; insert = null; return { data: [inserted], error: null }; }
      const data = (tables[table] ?? []).filter(r => filters.every(f => f(r)));
      if (update) { for (const r of data) Object.assign(r, update); update = null; }
      return { data, error: null };
    };
    q.maybeSingle = q.single = vi.fn(async () => { const r = execute(); return { data: r.data[0] ?? null, error: r.error }; });
    q.then = (done: (v: unknown) => void) => Promise.resolve(done(execute())); return q;
  });
  const png = await sharp({ create: { width: 4, height: 4, channels: 4, background: "#ffffff" } }).png().toBuffer();
  m.download.mockResolvedValue({ data: new Blob([new Uint8Array(png)]), error: null });
  m.fetch.mockImplementation(async (url: string, init: RequestInit) => {
    const body = init.body ? JSON.parse(String(init.body)) : null;
    remoteCalls.push({ url, method: init.method ?? "GET", body, headers: new Headers(init.headers) });
    if (url.includes("/accounts?")) return Response.json({ accounts: [{ _id: account, platform: accountPlatform, profileId: { _id: profile }, username: "@brand_a", displayName: "Brand A", isActive: true }, { _id: foreignAccount, platform: "instagram", profileId: foreignProfile, displayName: "Foreign", isActive: true }] });
    if (url.includes("/connect/")) return Response.json({ authUrl: "https://www.instagram.com/oauth/authorize?state=synthetic" });
    if (url.endsWith("/posts") && init.method === "POST") return Response.json({ post: { _id: remotePost, status: body.scheduledFor ? "scheduled" : "published", platforms: [{ platform: accountPlatform, accountId: account, status: body.scheduledFor ? "scheduled" : "published", platformPostUrl: "https://www.instagram.com/p/synthetic/" }] } });
    if (url.includes("/creator-info")) return Response.json({ creator: { nickname: "Brand A", canPostMore: true }, privacyLevels: [{ value: "PUBLIC_TO_EVERYONE", label: "Public" }], postingLimits: { interactionSettings: { allow_comment: { enabled: false } } }, commercialContentTypes: [{ value: "brand_organic", label: "Your brand" }] });
    return Response.json({ post: { _id: remotePost, status: "scheduled", platforms: [{ platform: accountPlatform, accountId: account, status: "scheduled" }] } });
  });
  vi.stubGlobal("fetch", m.fetch);
});
afterEach(() => vi.unstubAllGlobals());
describe("per-Brain social authorization and publishing", () => {
  it.each([GET, POST])("rejects guests and other accounts before database or provider access", async handler => {
    m.user.mockResolvedValueOnce(null); expect((await handler(req({}))).status).toBe(401);
    m.user.mockResolvedValueOnce({ id: other, email: "someone@example.test", email_confirmed_at: "yes" }); expect((await handler(req({}))).status).toBe(403);
    m.user.mockResolvedValueOnce({ id: owner, email: "erzen@nice.al", email_confirmed_at: null }); expect((await handler(req({}))).status).toBe(403);
    expect(m.from).not.toHaveBeenCalled(); expect(m.fetch).not.toHaveBeenCalled();
  });
  it("filters provider accounts to the exact profile and never exposes provider credentials", async () => {
    const response = await GET(req()); const body = await response.json();
    expect(body.accounts).toHaveLength(1); expect(body.accounts[0]).toMatchObject({ id: account, name: "Brand A" });
    expect(JSON.stringify(body)).not.toContain("synthetic-social-key"); expect(JSON.stringify(body)).not.toContain(foreignAccount);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("checks workspace ownership and publication input before any social network request", async () => {
    expect((await POST(req({ action: "connect", workspaceId: "foreign", platform: "instagram" }))).status).toBe(404);
    expect((await POST(req({ ...makeArgs(), consent: false }))).status).toBe(400);
    expect((await POST(req({ ...makeArgs(), providerUrl: "https://attacker.test" }))).status).toBe(400);
    expect(m.fetch).not.toHaveBeenCalled();
  });
  it("requires the approved version, asset, matching account and revision before creating a publication", async () => {
    expect((await POST(req({ ...makeArgs(), revision: 1 }))).status).toBe(409);
    const posts = (tables.maro_marketing_campaigns[0].plan as { posts: Row[] }).posts;
    posts[0].status = "draft"; expect((await POST(req(makeArgs()))).status).toBe(409); posts[0].status = "approved";
    expect((await POST(req({ ...makeArgs(), accountId: foreignAccount }))).status).toBe(404);
    expect(tables.maro_marketing_publications).toHaveLength(0);
    expect(remoteCalls.filter(c => c.url.endsWith("/posts"))).toHaveLength(0);
  });
  it("sends an immutable reviewed snapshot with a durable idempotency key and replays locally", async () => {
    expect((await POST(req(makeArgs()))).status).toBe(200);
    const publication = tables.maro_marketing_publications[0];
    const call = remoteCalls.find(c => c.url.endsWith("/posts"))!;
    expect(call.headers.get("Idempotency-Key")).toBe(publication.id);
    expect(call.body).toMatchObject({ content: "A real benefit\n\nOur real product\n\nDiscover", publishNow: true, platforms: [{ accountId: account, platform: "instagram" }] });
    expect(publication).toMatchObject({ status: "published", provider_id: remotePost });
    expect((await POST(req(makeArgs()))).status).toBe(200);
    expect(remoteCalls.filter(c => c.url.endsWith("/posts"))).toHaveLength(1);
  });
  it("serves only the explicitly shared owned image as JPEG through a bounded opaque token", async () => {
    await POST(req(makeArgs())); const p = tables.maro_marketing_publications[0];
    const url = ((p.snapshot as { payload: { mediaItems: { url: string }[] } }).payload.mediaItems[0].url);
    expect((await media(new Request("https://maro.al/api/marketing/media/image.jpg?token=wrong"))).status).toBe(404);
    const image = await media(new Request(url)); expect(image.status).toBe(200); expect(image.headers.get("content-type")).toBe("image/jpeg");
    expect((await sharp(Buffer.from(await image.arrayBuffer())).metadata()).format).toBe("jpeg");
    p.media_expires_at = new Date(Date.now() - 1000).toISOString(); expect((await media(new Request(url))).status).toBe(404);
    p.media_expires_at = new Date(Date.now() + 100000).toISOString(); (p.snapshot as Row).assetRef = `storage:generations/${other}/output.png`; expect((await media(new Request(url))).status).toBe(404);
    expect(String(p.media_token_hash)).toBe(createHash("sha256").update(new URL(url).searchParams.get("token")!).digest("hex"));
  });
  it("retains an unknown outcome and blocks duplicate publishing after a dropped provider response", async () => {
    const original = m.fetch.getMockImplementation()!; m.fetch.mockImplementation(async (url, init) => url.endsWith("/posts") ? Promise.reject(new Error("connection lost after send")) : original(url, init));
    expect((await POST(req(makeArgs()))).status).toBe(503);
    expect(tables.maro_marketing_publications[0].status).toBe("unknown");
    m.fetch.mockImplementation(original); expect((await POST(req(makeArgs()))).status).toBe(200);
    expect(tables.maro_marketing_publications).toHaveLength(1); expect(remoteCalls.filter(c => c.url.endsWith("/posts"))).toHaveLength(0);
  });
  it("validates the schedule and preserves a provider-managed future schedule", async () => {
    expect((await POST(req({ ...makeArgs(), scheduledFor: new Date(Date.now() - 1000).toISOString() }))).status).toBe(400);
    const schedule = new Date(Date.now() + 3600000).toISOString(); expect((await POST(req({ ...makeArgs(), scheduledFor: schedule }))).status).toBe(200);
    expect(remoteCalls.find(c => c.url.endsWith("/posts"))!.body).toMatchObject({ scheduledFor: schedule, timezone: "Europe/Berlin" });
    expect(tables.maro_marketing_publications[0].status).toBe("scheduled");
  });
  it("recovers an ambiguous send only with the original idempotency key and inside its safe window", async () => {
    await POST(req(makeArgs())); const p = tables.maro_marketing_publications[0]; p.status = "unknown"; p.provider_id = null;
    remoteCalls.length = 0;
    expect((await POST(req({ action: "recover", workspaceId: "ws", publicationId: p.id }))).status).toBe(200);
    expect(remoteCalls[0].headers.get("Idempotency-Key")).toBe(p.id); expect(p.status).toBe("published");
    p.status = "unknown"; p.provider_id = null; p.created_at = new Date(Date.now() - 24 * 3600000).toISOString(); remoteCalls.length = 0;
    expect((await POST(req({ action: "recover", workspaceId: "ws", publicationId: p.id }))).status).toBe(409); expect(remoteCalls).toHaveLength(0);
  });
  it("cancels only a remotely scheduled post and invalidates its shared image", async () => {
    await POST(req({ ...makeArgs(), scheduledFor: new Date(Date.now() + 3600000).toISOString() })); const p = tables.maro_marketing_publications[0];
    expect((await POST(req({ action: "cancel", workspaceId: "ws", publicationId: p.id }))).status).toBe(200);
    expect(p.status).toBe("cancelled"); expect(remoteCalls.some(c => c.method === "DELETE" && c.url.endsWith(remotePost))).toBe(true);
    expect(Date.parse(String(p.media_expires_at))).toBeLessThanOrEqual(Date.now());
    expect((await POST(req({ ...makeArgs(), scheduledFor: new Date(Date.now() + 7200000).toISOString() }))).status).toBe(200);
    expect(tables.maro_marketing_publications).toHaveLength(2);
  });
  it("binds connection requests to the Brain profile and requests only posting scopes", async () => {
    expect((await POST(req({ action: "connect", workspaceId: "ws", platform: "instagram" }))).status).toBe(200);
    const url = new URL(remoteCalls[0].url); expect(url.searchParams.get("profileId")).toBe(profile); expect(url.searchParams.get("scopes")).toBe("posting"); expect(url.searchParams.get("redirect_url")).toBe("https://maro.al/marketing?tab=socials");
  });
  it("uses fresh TikTok privacy/commercial choices and sends AI images for app completion", async () => {
    accountPlatform = "tiktok"; const posts = (tables.maro_marketing_campaigns[0].plan as { posts: Row[] }).posts; posts[0].channel = "tiktok";
    expect((await POST(req(makeArgs()))).status).toBe(400);
    const tiktok = { privacy: "PUBLIC_TO_EVERYONE", comments: false, commercial: "brand_organic", musicConsent: true };
    expect((await POST(req({ ...makeArgs(), tiktok: { ...tiktok, comments: true } }))).status).toBe(400);
    expect((await POST(req({ ...makeArgs(), tiktok }))).status).toBe(200);
    expect(remoteCalls.find(c => c.url.endsWith("/posts"))!.body).toMatchObject({ tiktokSettings: { draft: true, media_type: "photo", content_preview_confirmed: true, express_consent_given: true, auto_add_music: false } });
    expect(tables.maro_marketing_publications[0].status).toBe("awaiting_tiktok");
  });
});
