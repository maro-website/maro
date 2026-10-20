import { describe, it, expect, vi, beforeEach } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), db: vi.fn(() => { throw new Error("unexpected_database_access"); }), rate: vi.fn(async () => ({ allowed: true })) }));
vi.mock("@/lib/supabase/server", () => ({ supabaseServerConfigured: () => true, getUserFromToken: mocks.user, getSupabaseAdmin: mocks.db, getWorkspaceBrainProfile: vi.fn(), resolveAssetListForClient: vi.fn() }));
vi.mock("@/lib/security/rateLimit", () => ({ checkRateLimit: mocks.rate }));
vi.mock("@/lib/admin/auth", () => ({ requirePermission: vi.fn(async () => ({ ok: false, status: 403, error: "forbidden" })) }));
import { handleFeedGet, handleFeedCreate, handleFeedAction } from "@/lib/feed/server";
import { GET as download } from "@/app/api/feed/download/route";
import { PUT as config } from "@/app/api/admin/engine/feed/route";
const req = (path: string, body?: unknown) => new Request(`https://maro.al${path}`, { method: body === undefined ? "GET" : "POST", headers: { Authorization: "Bearer synthetic", "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
beforeEach(() => { vi.clearAllMocks(); mocks.user.mockResolvedValue(null); });
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
});
