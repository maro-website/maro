import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), rate: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/admin/auth", () => ({ requirePermission: mocks.auth }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdmin: () => ({ rpc: mocks.rpc, from: mocks.from }) }));
vi.mock("@/lib/security/rateLimit", () => ({ checkRateLimit: mocks.rate }));
import { GET, POST, PATCH, DELETE } from "@/app/api/admin/freebies/route";

const actor = "11111111-1111-4111-8111-111111111111", id = "22222222-2222-4222-8222-222222222222";
const body = { id, code: " trampoline ", title: "Launch promotion", credits: 10, maxClaims: 100, minGenerations: 0,
  targetUserId: null, planId: null, planDays: null, startsAt: "2026-10-10T00:00:00Z", expiresAt: null };
const req = (extra = {}, method = "POST", payload = body) => new Request("https://maro.al/api/admin/freebies", { method,
  headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, ...extra }) });
const editBody = { id, title: "Launch promotion", credits: 15, maxClaims: 100, minGenerations: 0,
  planId: null, planDays: null, expiresAt: null, expectedUpdatedAt: "2026-10-10T00:00:00.123456+00:00" };
const mutation = (method: string, payload: unknown) => new Request("https://maro.al/api/admin/freebies", { method,
  headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
beforeEach(() => {
  vi.clearAllMocks(); mocks.auth.mockResolvedValue({ ok: true, admin: { userId: actor } });
  mocks.rate.mockResolvedValue({ allowed: true, retryAfter: 0 });
  mocks.rpc.mockResolvedValue({ data: { ok: true, drop_id: id, already: false }, error: null });
});
describe("admin Freebies authorization and configuration", () => {
  it.each(["forbidden", "mfa_challenge_required", "insufficient_permission"])("blocks all admin operations on %s", async error => {
    mocks.auth.mockResolvedValue({ ok: false, status: 403, error });
    expect((await GET(new Request("https://maro.al/api/admin/freebies"))).status).toBe(403);
    expect((await POST(req())).status).toBe(403);
    expect((await PATCH(req({}, "PATCH", { id, active: false } as unknown as typeof body))).status).toBe(403);
    expect((await PATCH(mutation("PATCH", editBody))).status).toBe(403);
    expect((await DELETE(mutation("DELETE", { id, code: "TRAMPOLINE", expectedUpdatedAt: editBody.expectedUpdatedAt }))).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.from).not.toHaveBeenCalled();
  });
  it("requires the credit permission and supplies the verified actor to the atomic creation", async () => {
    expect((await POST(req())).status).toBe(201);
    expect(mocks.auth).toHaveBeenCalledWith(expect.any(Request), "credits.adjust");
    expect(mocks.rpc).toHaveBeenCalledWith("admin_create_freebie_drop", expect.objectContaining({ p_actor: actor, p_code: "TRAMPOLINE", p_credits: 10, p_max_claims: 100 }));
    expect((await POST(req({ actorId: id }))).status).toBe(400);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it("rejects inconsistent personal limits, plan terms and fractional rewards", async () => {
    for (const extra of [{ targetUserId: actor, maxClaims: 100 }, { planId: "pro", planDays: null }, { credits: 1.5 }, { credits: -5 }, { expiresAt: "2026-10-09T00:00:00Z" }]) {
      expect((await POST(req(extra))).status).toBe(400);
    }
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("returns conflict on a duplicate code and gates writes when limited", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "23505" } });
    expect((await POST(req())).status).toBe(409);
    mocks.rate.mockResolvedValueOnce({ allowed: false, retryAfter: 70 });
    const response = await POST(req()); expect(response.status).toBe(429); expect(response.headers.get("Retry-After")).toBe("70");
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it("edits with the verified actor and never accepts forged quota, audience or owner fields", async () => {
    expect((await PATCH(mutation("PATCH", editBody))).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("admin_update_freebie_drop", expect.objectContaining({ p_actor: actor, p_drop_id: id,
      p_credits: 15, p_expected_updated_at: editBody.expectedUpdatedAt }));
    for (const extra of [{ actorId: id }, { claimsCount: 0 }, { code: "RENAMED" }, { targetUserId: actor }, { credits: 1.5 }, { expectedUpdatedAt: null }, { planId: "pro", planDays: null }]) {
      expect((await PATCH(mutation("PATCH", { ...editBody, ...extra }))).status).toBe(400);
    }
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it("requires code confirmation and an existing version when deleting", async () => {
    const payload = { id, code: " trampoline ", expectedUpdatedAt: editBody.expectedUpdatedAt };
    expect((await DELETE(mutation("DELETE", payload))).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("admin_delete_freebie_drop", { p_actor: actor, p_drop_id: id, p_code: "TRAMPOLINE", p_expected_updated_at: editBody.expectedUpdatedAt });
    expect((await DELETE(mutation("DELETE", { id }))).status).toBe(400);
    expect((await DELETE(mutation("DELETE", { ...payload, actorId: id }))).status).toBe(400);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it("reports stale edits as conflict and rejects rate-limited deletion before any write", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { ok: false, error: "drop_changed" }, error: null });
    expect((await PATCH(mutation("PATCH", editBody))).status).toBe(409);
    mocks.rate.mockResolvedValueOnce({ allowed: false, retryAfter: 45 });
    const response = await DELETE(mutation("DELETE", { id, code: "TRAMPOLINE", expectedUpdatedAt: editBody.expectedUpdatedAt }));
    expect(response.status).toBe(429); expect(response.headers.get("Retry-After")).toBe("45");
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
});
