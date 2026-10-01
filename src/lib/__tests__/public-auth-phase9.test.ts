import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
const mocks = vi.hoisted(() => ({ signUp: vi.fn(), resend: vi.fn(), recovery: vi.fn(), verify: vi.fn(), exchange: vi.fn(), signOut: vi.fn(), insert: vi.fn(), rate: vi.fn(), captcha: vi.fn(), configured: true }));
vi.mock("@/lib/supabase/server", () => ({ supabaseServerConfigured: () => true, getSupabaseAdmin: () => ({ from: () => ({ insert: mocks.insert }) }) }));
vi.mock("@/lib/supabase/routeHandler", () => ({
  supabaseRouteHandlerConfigured: () => mocks.configured,
  createSupabaseRouteHandlerClient: (_req: NextRequest, response: NextResponse) => {
    response.cookies.set("sb-test-auth-token-code-verifier", "test-only-verifier");
    return { auth: { signUp: mocks.signUp, resend: mocks.resend, resetPasswordForEmail: mocks.recovery, verifyOtp: mocks.verify, exchangeCodeForSession: mocks.exchange, signOut: mocks.signOut } };
  },
}));
vi.mock("@/lib/security/rateLimit", () => ({ clientIp: () => "127.0.0.1", enforceRateLimit: mocks.rate }));
vi.mock("@/lib/security/turnstile", () => ({ verifyTurnstileToken: mocks.captcha }));
import { POST as signup } from "@/app/api/auth/signup/route";
import { POST as resend } from "@/app/api/auth/resend-confirmation/route";
import { POST as recovery } from "@/app/api/auth/forgot-password/route";
import { GET as callback } from "@/app/auth/callback/route";
import { completePasswordReset } from "@/lib/auth/passwordReset";
import { authErrorMessage } from "@/lib/auth/messages";
import { roleRequiresMfa } from "@/lib/admin/mfaPolicy";
const request = (body: unknown) => new NextRequest("https://maro.al/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const valid = { email: "owner@example.org", name: "Preview", password: "test-only-strong-password", turnstileToken: "mock-captcha" };
beforeEach(() => {
  vi.resetAllMocks(); mocks.configured = true;
  vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("NEXT_PUBLIC_SIGNUP_ENABLED", "true"); vi.stubEnv("APP_ORIGIN", "https://maro.al");
  mocks.rate.mockResolvedValue({ allowed: true }); mocks.captcha.mockResolvedValue({ ok: true });
  mocks.signUp.mockResolvedValue({ data: { session: null, user: { id: "mock-user", identities: [{}] } }, error: null });
  for (const fn of [mocks.resend, mocks.recovery, mocks.verify, mocks.exchange, mocks.signOut, mocks.insert]) fn.mockResolvedValue({ error: null });
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("public signup initiation", () => {
  it("denies disabled signup without auth or rate-limit mutation", async () => {
    vi.stubEnv("NEXT_PUBLIC_SIGNUP_ENABLED", "false"); expect((await signup(request(valid))).status).toBe(403);
    expect(mocks.signUp).not.toHaveBeenCalled(); expect(mocks.rate).not.toHaveBeenCalled();
  });
  it("initiates supported confirmation with metadata, canonical URL and SSR cookies", async () => {
    const response = await signup(request(valid)); expect(response.status).toBe(200);
    expect(mocks.signUp).toHaveBeenCalledWith(expect.objectContaining({ email: valid.email, options: expect.objectContaining({ data: { full_name: "Preview" }, emailRedirectTo: "https://maro.al/auth/callback?type=signup&next=%2Fsign-in%3Fconfirmed%3D1" }) }));
    expect(response.cookies.has("sb-test-auth-token-code-verifier")).toBe(true);
    expect(mocks.insert).toHaveBeenCalledOnce();
    expect(JSON.stringify(await response.json())).not.toContain("mock-user");
  });
  it.each(["turnstile_required", "turnstile_failed", "turnstile_not_configured"])("fails closed for %s", async reason => {
    mocks.captcha.mockResolvedValue({ ok: false, reason }); expect((await signup(request(valid))).status).toBe(403); expect(mocks.signUp).not.toHaveBeenCalled();
  });
  it.each([{ email: "bad" }, { password: "x" }, { email: {} }, { password: {} }])("rejects malformed fields %j", async fields => {
    expect((await signup(request({ ...valid, ...fields }))).status).toBe(400); expect(mocks.signUp).not.toHaveBeenCalled();
  });
  it("keeps confirmed duplicate response identical and writes no fake signal", async () => {
    const first = await (await signup(request(valid))).json(); mocks.insert.mockClear();
    mocks.signUp.mockResolvedValue({ data: { session: null, user: { id: "obfuscated", identities: [] } }, error: null });
    expect(await (await signup(request(valid))).json()).toEqual(first); expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("keeps an explicit duplicate error private", async () => {
    mocks.signUp.mockResolvedValue({ data: { user: null, session: null }, error: { code: "user_already_exists", message: "private" } });
    expect(await (await signup(request(valid))).json()).toEqual({ ok: true, needsEmailConfirmation: true });
  });
  it("does not expose an unexpected auto-confirmed session", async () => {
    mocks.signUp.mockResolvedValue({ data: { session: {}, user: { id: "mock-user" } }, error: null });
    const response = await signup(request(valid)); expect(response.status).toBe(503); expect(response.cookies.getAll()).toHaveLength(0); expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
  it("maps email-provider failures without raw internals", async () => {
    mocks.signUp.mockResolvedValue({ data: {}, error: { message: "secret-provider-detail", code: "unexpected_failure" } });
    const response = await signup(request(valid)); expect(response.status).toBe(503); expect(await response.text()).not.toContain("secret-provider-detail");
  });
});

describe("email requests", () => {
  it.each([resend, recovery])("enforces IP rate limits before sending", async route => {
    mocks.rate.mockResolvedValue({ allowed: false, retryAfter: 60 }); expect((await route(request(valid))).status).toBe(429);
    expect(mocks.resend).not.toHaveBeenCalled(); expect(mocks.recovery).not.toHaveBeenCalled();
  });
  it("resends a signup confirmation without creating a user", async () => {
    const response = await resend(request(valid)); expect(response.status).toBe(200); expect(mocks.resend).toHaveBeenCalledWith(expect.objectContaining({ type: "signup", email: valid.email })); expect(mocks.signUp).not.toHaveBeenCalled();
  });
  it("gives identical resend responses for unknown and already-confirmed accounts", async () => {
    const first = await (await resend(request(valid))).json(); mocks.resend.mockResolvedValue({ error: { code: "user_not_found" } });
    expect(await (await resend(request(valid))).json()).toEqual(first);
  });
  it("returns recovery's verifier cookie and canonical reset destination", async () => {
    const response = await recovery(request(valid)); expect(response.cookies.has("sb-test-auth-token-code-verifier")).toBe(true);
    expect(mocks.recovery).toHaveBeenCalledWith(valid.email, { redirectTo: "https://maro.al/auth/callback?type=recovery&next=%2Freset-password" });
  });
  it("requires recovery CAPTCHA even with signup disabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_SIGNUP_ENABLED", "false"); mocks.captcha.mockResolvedValue({ ok: false, reason: "turnstile_required" });
    expect((await recovery(request(valid))).status).toBe(403); expect(mocks.captcha).toHaveBeenCalledWith(valid.turnstileToken, "127.0.0.1", { required: true }); expect(mocks.recovery).not.toHaveBeenCalled();
  });
});

describe("canonical callback", () => {
  it.each(["", "?token_hash=fake&type=bad", "?code=fake&token_hash=fake&type=signup", "?token_hash=fake&type=signup&next=https://evil.example", "?code=fake&next=%2F%09%2Fevil.example"])("rejects unsafe/malformed callback %s before exchanging", async query => {
    const response = await callback(new NextRequest(`https://maro.al/auth/callback${query}`));
    expect(response.headers.get("location")).toMatch(/^https:\/\/maro\.al\/sign-in\?auth_error=/); expect(mocks.verify).not.toHaveBeenCalled(); expect(mocks.exchange).not.toHaveBeenCalled();
  });
  it("confirms a token and returns session cookies on the canonical redirect", async () => {
    const response = await callback(new NextRequest("https://maro.al/auth/callback?token_hash=fake&type=signup&next=%2Fsign-in%3Fconfirmed%3D1"));
    expect(mocks.verify).toHaveBeenCalledWith({ token_hash: "fake", type: "signup" }); expect(response.headers.get("location")).toBe("https://maro.al/sign-in?confirmed=1"); expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });
  it.each(["invalid token", "token expired", "already been used"])("handles %s without returning token", async message => {
    mocks.verify.mockResolvedValue({ error: { message } }); const r = await callback(new NextRequest("https://maro.al/auth/callback?token_hash=fake&type=signup"));
    expect(r.headers.get("location")).toMatch(/auth_error=(expired_link|invalid_link)$/); expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain("token_hash=fake");
  });
  it("exchanges recovery code then opens reset, not a second callback", async () => {
    const r = await callback(new NextRequest("https://maro.al/auth/callback?code=fake&type=recovery&next=%2Faccount"));
    expect(mocks.exchange).toHaveBeenCalledWith("fake"); expect(r.headers.get("location")).toBe("https://maro.al/reset-password");
  });
});

describe("login and reset safety", () => {
  it("uses one safe wrong/unknown credential message and preserves MFA policy", () => {
    expect(authErrorMessage("invalid_credentials")).toContain("nuk është i saktë"); expect(authErrorMessage("email_not_confirmed")).toContain("Konfirmo");
    expect(roleRequiresMfa("super_admin")).toBe(true); expect(roleRequiresMfa("administrator")).toBe(true);
  });
  it("updates only a verified session then logs out", async () => {
    const auth = { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "mock" } }, error: null }), updateUser: vi.fn().mockResolvedValue({ error: null }), signOut: vi.fn().mockResolvedValue({ error: null }) };
    expect(await completePasswordReset({ auth } as unknown as SupabaseClient, "test-password")).toBeNull(); expect(auth.updateUser).toHaveBeenCalledWith({ password: "test-password" }); expect(auth.signOut).toHaveBeenCalledOnce();
  });
  it("rejects an invalid/expired reset session before updating", async () => {
    const auth = { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: {} }), updateUser: vi.fn(), signOut: vi.fn() };
    expect(await completePasswordReset({ auth } as unknown as SupabaseClient, "test-password")).toContain("skaduar"); expect(auth.updateUser).not.toHaveBeenCalled();
  });
  it("does not expose update internals or sign out on rejected password", async () => {
    const auth = { getUser: vi.fn().mockResolvedValue({ data: { user: {} } }), updateUser: vi.fn().mockResolvedValue({ error: { code: "weak_password", message: "private" } }), signOut: vi.fn() };
    expect(await completePasswordReset({ auth } as unknown as SupabaseClient, "weak")).not.toContain("private"); expect(auth.signOut).not.toHaveBeenCalled();
  });
});
