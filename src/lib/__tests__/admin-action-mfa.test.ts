import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ factors: vi.fn(), rate: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdmin: () => ({ auth: { admin: { mfa: { listFactors: mock.factors } } } }) }));
vi.mock("@/lib/security/rateLimit", () => ({ checkRateLimit: mock.rate }));
import { verifyAdminActionMfa } from "@/lib/admin/actionMfa";
const actor = "11111111-1111-4111-8111-111111111111";
const request = new Request("https://example.invalid/api/admin/users/plan", { headers: { Authorization: "Bearer actor-test-session" } });
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.invalid"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-public-key");
  mock.rate.mockResolvedValue({ allowed: true, retryAfter: 0 });
  mock.factors.mockResolvedValue({ data: { factors: [{ id: "own-factor", factor_type: "totp", status: "verified" }] }, error: null });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe("fresh server MFA verification", () => {
  it("uses the actor's factor and bearer token through the real SDK, without passing the service credential", async () => {
    const calls: Array<{ url: string; headers: Headers; body: string }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, headers: new Headers(init.headers), body: String(init.body) });
      return Response.json(url.endsWith("/challenge") ? { id: "challenge-test", expires_at: Date.now() + 60000 } : { access_token: "verified-test-token", refresh_token: "test-refresh", expires_in: 3600, token_type: "bearer", user: { id: actor } });
    });
    expect(await verifyAdminActionMfa(request, actor, "123456")).toBeNull();
    expect(mock.factors).toHaveBeenCalledWith({ userId: actor }); expect(calls).toHaveLength(2);
    for (const call of calls) { expect(call.url).toContain("/factors/own-factor/"); expect(call.headers.get("authorization")).toBe("Bearer actor-test-session"); expect(call.headers.get("apikey")).toBe("test-public-key"); }
    expect(JSON.parse(calls[1].body)).toMatchObject({ code: "123456", challenge_id: "challenge-test" });
  });
  it("denies invalid OTPs and verification for a different identity", async () => {
    vi.stubGlobal("fetch", async (url: string) => Response.json(url.endsWith("/challenge") ? { id: "challenge-test" } : { access_token: "test", refresh_token: "test", expires_in: 3600, token_type: "bearer", user: { id: "different-user" } }));
    expect((await verifyAdminActionMfa(request, actor, "123456"))?.status).toBe(403);
    vi.stubGlobal("fetch", async () => Response.json({ code: "mfa_verification_failed", msg: "Invalid test OTP" }, { status: 422 }));
    expect((await verifyAdminActionMfa(request, actor, "123456"))?.status).toBe(403);
  });
  it("denies missing MFA and returns the actual rate-limit deadline before contacting Auth", async () => {
    expect((await verifyAdminActionMfa(request, actor, "bad"))?.status).toBe(400);
    mock.rate.mockResolvedValueOnce({ allowed: false, retryAfter: 125 });
    const limited = await verifyAdminActionMfa(request, actor, "123456"); expect(limited?.status).toBe(429); expect(limited?.headers.get("Retry-After")).toBe("125");
    mock.factors.mockResolvedValueOnce({ data: { factors: [] }, error: null }); expect((await verifyAdminActionMfa(request, actor, "123456"))?.status).toBe(403);
  });
});
