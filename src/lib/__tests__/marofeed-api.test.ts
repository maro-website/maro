import { describe, it, expect, vi, beforeEach } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), db: vi.fn(() => { throw new Error("unexpected_database_access"); }), sign: vi.fn(async (refs: string[]) => refs.map(ref => `signed:${ref}`)), rate: vi.fn(async () => ({ allowed: true })) }));
vi.mock("@/lib/supabase/server", () => ({ supabaseServerConfigured: () => true, getUserFromToken: mocks.user, getSupabaseAdmin: mocks.db, getWorkspaceBrainProfile: vi.fn(), resolveAssetListForClient: mocks.sign }));
vi.mock("@/lib/security/rateLimit", () => ({ checkRateLimit: mocks.rate }));
vi.mock("@/lib/admin/auth", () => ({ requirePermission: vi.fn(async () => ({ ok: false, status: 403, error: "forbidden" })) }));
import { handleFeedGet, handleFeedCreate, handleFeedAction } from "@/lib/feed/server";
import { GET as download } from "@/app/api/feed/download/route";
import { PUT as config } from "@/app/api/admin/engine/feed/route";
const req = (path: string, body?: unknown) => new Request(`https://maro.al${path}`, { method: body === undefined ? "GET" : "POST", headers: { Authorization: "Bearer synthetic", "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
beforeEach(() => { vi.clearAllMocks(); mocks.user.mockResolvedValue(null); });

type Row = Record<string, unknown>;
function readOnlyDatabase(tables: Record<string, Row[]>) {
  return { from(table: string) {
    let rows = tables[table] ?? [];
    const q = { select: () => q, eq: (key: string, value: unknown) => { rows = rows.filter(row => row[key] === value); return q; }, in: (key: string, values: unknown[]) => { rows = rows.filter(row => values.includes(row[key])); return q; }, filter: () => q, order: () => q, limit: () => q, maybeSingle: async () => ({ data: rows[0] ?? null, error: null }), then: (resolve: (value: unknown) => void) => Promise.resolve({ data: rows, error: null }).then(resolve) };
    return q;
  } };
}
describe("maroFeed preparation and ownership", () => {
  it("downloads completed images as a partial ZIP while excluding unfinished and foreign jobs", async () => {
    const feedId = crypto.randomUUID(); mocks.user.mockResolvedValue({ id: "owner", email: "erzen@nice.al", email_confirmed_at: "2026-11-01" });
    const downloadObject = vi.fn(async () => ({ data: new Blob([new Uint8Array([137, 80, 78, 71])]), error: null }));
    mocks.db.mockReturnValue({ ...readOnlyDatabase({ maro_feeds: [{ id: feedId, owner_id: "owner", brief: {} }], maro_feed_attempts: [
      { feed_id: feedId, owner_id: "owner", slot: 0, job_id: "first", status: "completed" },
      { feed_id: feedId, owner_id: "owner", slot: 1, job_id: "pending", status: "running" },
      { feed_id: feedId, owner_id: "owner", slot: 3, job_id: "fourth", status: "completed" },
      { feed_id: feedId, owner_id: "other", slot: 4, job_id: "foreign", status: "completed" },
    ] }), storage: { from: () => ({ download: downloadObject }) } } as never);
    const response = await download(req(`/api/feed/download?feedId=${feedId}`));
    expect(response.status).toBe(200); expect(response.headers.get("Content-Disposition")).toContain("maroFeed-2-posts.zip");
    expect([...new Uint8Array(await response.arrayBuffer()).slice(0, 2)]).toEqual([80, 75]);
    expect(downloadObject.mock.calls).toEqual([["owner/first/output.png"], ["owner/fourth/output.png"]]);
  });
  it.each(["running", "rejected", "uncertain", "completed"])("recovers an owned %s preparation without provider work or exposing prompts", async status => {
    const owner = "owner", requestId = crypto.randomUUID(), created_at = "2026-11-01T12:00:00Z";
    mocks.user.mockResolvedValue({ id: owner, email: "erzen@nice.al", email_confirmed_at: created_at });
    mocks.db.mockReturnValue(readOnlyDatabase({ workspaces: [{ id: "ws", owner_id: owner }], maro_optimizer_attempts: [{ user_id: owner, workspace_id: "ws", request_key: `feed-plan:${requestId}`, version: "maro-context/1", status, created_at, final_prompt: "private candidate" }] }) as never);
    const response = await handleFeedGet(req(`/api/feed?workspaceId=ws&requestId=${requestId}`));
    expect(response.status).toBe(200); const body = await response.json();
    expect(body.preparation.state).toBe(status === "running" ? "running" : status === "completed" ? "prepared" : "failed");
    expect(JSON.stringify(body)).not.toMatch(/private candidate|final_prompt|version/);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("does not reveal a foreign pending request or another workspace's created feed", async () => {
    const requestId = crypto.randomUUID(); mocks.user.mockResolvedValue({ id: "owner", email: "erzen@nice.al", email_confirmed_at: "2026-11-01" });
    const tables = { workspaces: [{ id: "ws", owner_id: "owner" }], maro_optimizer_attempts: [{ user_id: "other", workspace_id: "ws", request_key: `feed-plan:${requestId}`, status: "running" }], maro_feeds: [] as Row[] };
    mocks.db.mockReturnValue(readOnlyDatabase(tables) as never);
    expect(await (await handleFeedGet(req(`/api/feed?workspaceId=ws&requestId=${requestId}`))).json()).toEqual({ preparation: { state: "missing" } });
    tables.maro_feeds.push({ owner_id: "owner", request_id: requestId, workspace_id: "different", brief: {} });
    expect((await handleFeedGet(req(`/api/feed?workspaceId=ws&requestId=${requestId}`))).status).toBe(404);
    expect((await handleFeedGet(req(`/api/feed?workspaceId=foreign&requestId=${requestId}`))).status).toBe(404);
  });
  it("counts only owned completed initial slots and signs only their cover", async () => {
    mocks.user.mockResolvedValue({ id: "owner", email: "erzen@nice.al", email_confirmed_at: "2026-11-01" });
    mocks.db.mockReturnValue(readOnlyDatabase({ workspaces: [{ id: "ws", owner_id: "owner" }], maro_feeds: [{ id: "feed", owner_id: "owner", workspace_id: "ws", brief: { brand: "Original" }, created_at: "2026-11-01" }], maro_feed_attempts: [
      { feed_id: "feed", owner_id: "owner", slot: 0, job_id: "initial", status: "completed", regenerate: false },
      { feed_id: "feed", owner_id: "owner", slot: 0, job_id: "regen", status: "completed", regenerate: true },
      { feed_id: "feed", owner_id: "owner", slot: 1, job_id: "active", status: "running", regenerate: false },
      { feed_id: "feed", owner_id: "other", slot: 2, job_id: "foreign", status: "completed", regenerate: false },
    ] }) as never);
    const response = await handleFeedGet(req("/api/feed?workspaceId=ws")); expect(response.status).toBe(200);
    expect((await response.json()).feeds[0]).toMatchObject({ done: 1, running: true, cover: "signed:storage:generations/owner/initial/output.png" });
    expect(mocks.sign).toHaveBeenCalledWith(["storage:generations/owner/initial/output.png"]);
  });
});

describe("maroFeed authenticated boundaries", () => {
  it("rejects guests on every route before storage, credits or provider work", async () => {
    const results = await Promise.all([handleFeedGet(req("/api/feed")), handleFeedCreate(req("/api/feed", {})), handleFeedAction(req("/api/feed/action", {})), download(req("/api/feed/download"))]);
    expect(results.map(r => r.status)).toEqual([401, 401, 401, 401]); expect(mocks.db).not.toHaveBeenCalled();
    for (const result of results) { expect(result.headers.get("Cache-Control")).toBe("no-store"); expect(result.headers.get("Vary")).toBe("Authorization"); }
  });
  it.each([{ email: "other@nice.al", email_confirmed_at: "2026-10-20" }, { email: "erzen@nice.al", email_confirmed_at: null }])("rejects accounts outside the verified pilot", async user => {
    mocks.user.mockResolvedValue({ id: "synthetic", ...user });
    const result = await handleFeedCreate(req("/api/feed", {})); expect(result.status).toBe(404); expect(mocks.db).not.toHaveBeenCalled();
  });
  it("rejects a missing upload and forged prices or free counters before financial work", async () => {
    mocks.user.mockResolvedValue({ id: "synthetic", email: "erzen@nice.al", email_confirmed_at: "2026-10-20" });
    const missing = await handleFeedCreate(req("/api/feed", { requestId: crypto.randomUUID(), workspaceId: "ws", category: "drinks", useBrain: false, brief: {} }));
    const forged = await handleFeedAction(req("/api/feed/action", { feedId: crypto.randomUUID(), requestId: crypto.randomUUID(), action: "regenerate", slot: 0, price: 0, freeUsed: 0 }));
    expect(missing.status).toBe(400); expect(forged.status).toBe(400); expect(mocks.db).not.toHaveBeenCalled();
  });
  it("requires the existing MFA-protected admin permission for direction changes", async () => {
    const result = await config(req("/api/admin/engine/feed", {})); expect(result.status).toBe(403); expect(mocks.db).not.toHaveBeenCalled();
  });
  it("requires explicit typography and format choices before any new Feed storage or financial work", async () => {
    mocks.user.mockResolvedValue({ id: "synthetic", email: "erzen@nice.al", email_confirmed_at: "2026-10-31" });
    const result = await handleFeedCreate(req("/api/feed", { requestId: crypto.randomUUID(), workspaceId: "ws", category: "drinks", useBrain: false, references: ["storage:generations/synthetic/ref.png"], brief: {} }));
    expect(result.status).toBe(400); expect(await result.json()).toEqual({ error: "design_incomplete" }); expect(mocks.db).not.toHaveBeenCalled();
  });
});
