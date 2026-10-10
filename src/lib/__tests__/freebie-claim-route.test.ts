import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), rpc: vi.fn(), rate: vi.fn(), configured: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getUserFromToken: mocks.user, getSupabaseAdmin: () => ({ rpc: mocks.rpc }), supabaseServerConfigured: mocks.configured }));
vi.mock("@/lib/security/rateLimit", () => ({ checkRateLimit: mocks.rate, clientIp: () => "203.0.113.1" }));
import { POST } from "@/app/api/bonus/claim/route";

const id = "11111111-1111-4111-8111-111111111111";
const req = (body: unknown = { code: " trampoline " }, token = "test-token") => new Request("https://maro.al/api/bonus/claim", {
  method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
});
beforeEach(() => {
  vi.clearAllMocks(); mocks.configured.mockReturnValue(true);
  mocks.user.mockResolvedValue({ id, email_confirmed_at: "2026-10-10T00:00:00Z" });
  mocks.rate.mockResolvedValue({ allowed: true, retryAfter: 0 });
  mocks.rpc.mockResolvedValue({ data: { ok: true, credits: 10, balance: 33, claim_id: "test-claim", plan_id: null, expires_at: null }, error: null });
});
describe("authenticated free credit redemption", () => {
  it("derives the recipient from the verified token and normalizes only the code", async () => {
    expect((await POST(req())).status).toBe(200);
    expect(mocks.user).toHaveBeenCalledWith("test-token");
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("claim_freebie_drop", { p_user: id, p_code: "TRAMPOLINE" });
    expect((await POST(req({ code: "TRAMPOLINE", userId: "forged", credits: 1000 }))).status).toBe(400);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it("requires a live session and confirmed email before touching credits", async () => {
    mocks.user.mockResolvedValueOnce(null); expect((await POST(req())).status).toBe(401);
    mocks.user.mockResolvedValueOnce({ id, email_confirmed_at: null }); expect((await POST(req())).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("enforces server limits with a retry timer and never redeems while limited", async () => {
    mocks.rate.mockResolvedValueOnce({ allowed: false, retryAfter: 125 });
    const response = await POST(req());
    expect(response.status).toBe(429); expect(response.headers.get("Retry-After")).toBe("125");
    expect(await response.json()).toMatchObject({ error: "rate_limited", retry_after: 125 });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each(["already_claimed", "claims_exhausted", "wrong_account", "code_expired", "activity_required"])("returns the database rejection %s without showing success", async error => {
    mocks.rpc.mockResolvedValueOnce({ data: { ok: false, error, required: 2, current: 0 }, error: null });
    const response = await POST(req()); expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ ok: false, error });
  });
  it("fails closed on database outage and rejects oversized input", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "PRIVATE DATABASE DETAILS" } });
    const response = await POST(req()); expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "bonus_unavailable" });
    expect((await POST(req({ code: "X".repeat(5000) }))).status).toBe(413);
  });
});
