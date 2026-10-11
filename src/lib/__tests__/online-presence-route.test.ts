import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), rate: vi.fn(), user: vi.fn() }));
vi.mock("@/lib/admin/auth", () => ({ requirePermission: mocks.auth }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdmin: () => ({ rpc: mocks.rpc }), getUserFromToken: mocks.user, supabaseServerConfigured: () => true }));
vi.mock("@/lib/security/rateLimit", () => ({ checkRateLimit: mocks.rate, clientIp: () => "192.0.2.1" }));
import { POST } from "@/app/api/presence/route";
import { GET } from "@/app/api/admin/analytics/online/route";

const id = "11111111-1111-4111-8111-111111111111";
const request = (body: unknown = { sessionId: id }, origin = "https://maro.al", token = "") => new Request("https://maro.al/api/presence", {
  method: "POST", headers: { Origin: origin, "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body),
});
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only-secret");
  mocks.user.mockResolvedValue(null); mocks.rate.mockResolvedValue({ allowed: true });
  mocks.auth.mockResolvedValue({ ok: true }); mocks.rpc.mockResolvedValue({ error: null, data: { total: 3, signedIn: 1, guests: 2, windowSeconds: 120 } });
});
afterEach(() => vi.unstubAllEnvs());

describe("presence requests and admin-only totals", () => {
  it("records guests without returning totals or setting a tracking cookie", async () => {
    const result = await POST(request());
    expect(result.status).toBe(204); expect(await result.text()).toBe(""); expect(result.headers.has("Set-Cookie")).toBe(false);
    expect(mocks.rpc).toHaveBeenCalledWith("touch_online_presence", { p_key: expect.stringMatching(/^[a-f0-9]{64}$/), p_signed_in: false });
    expect(mocks.rate).toHaveBeenCalledWith("presence", expect.stringMatching(/^[a-f0-9]{64}$/), 300, 60, "strict");
  });
  it("deduplicates a verified account across different browser sessions", async () => {
    mocks.user.mockResolvedValue({ id: "account-id" });
    await POST(request({ sessionId: id }, "https://maro.al", "verified-token"));
    await POST(request({ sessionId: "22222222-2222-4222-8222-222222222222" }, "https://maro.al", "verified-token"));
    expect(mocks.user).toHaveBeenCalledWith("verified-token");
    expect(mocks.rpc.mock.calls[0][1]).toEqual(mocks.rpc.mock.calls[1][1]);
    expect(mocks.rpc.mock.calls[0][1].p_signed_in).toBe(true);
    expect(JSON.stringify(mocks.rpc.mock.calls)).not.toContain("account-id");
  });
  it("rejects foreign origins, forged user fields and oversized bodies before touching the database", async () => {
    expect((await POST(request(undefined, "https://other.invalid"))).status).toBe(403);
    expect((await POST(request({ sessionId: id, userId: id }))).status).toBe(400);
    expect((await POST(request({ sessionId: "wrong" }))).status).toBe(400);
    expect((await POST(request({ sessionId: "x".repeat(500) }))).status).toBe(413);
    expect(mocks.rate).not.toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("stops limited requests and reports dependency failures without leaking details", async () => {
    mocks.rate.mockResolvedValueOnce({ allowed: false, retryAfter: 45 });
    const result = await POST(request()); expect(result.status).toBe(429); expect(result.headers.get("Retry-After")).toBe("45");
    expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.rpc.mockResolvedValueOnce({ error: { message: "private database failure" } });
    const failed = await POST(request()); expect(failed.status).toBe(503); expect(await failed.text()).not.toContain("private");
  });
  it.each(["forbidden", "mfa_challenge_required", "insufficient_permission"])("requires analytics permission and MFA: %s", async error => {
    mocks.auth.mockResolvedValue({ ok: false, status: 403, error });
    expect((await GET(new Request("https://maro.al/api/admin/analytics/online"))).status).toBe(403);
    expect(mocks.auth).toHaveBeenCalledWith(expect.any(Request), "analytics.view"); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("returns uncached aggregate counts only to admins and does not turn an outage into zero", async () => {
    const result = await GET(new Request("https://maro.al/api/admin/analytics/online"));
    expect(result.status).toBe(200); expect(result.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await result.json()).toMatchObject({ total: 3, signedIn: 1, guests: 2 });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: {} });
    expect((await GET(new Request("https://maro.al/api/admin/analytics/online"))).status).toBe(503);
  });
});
