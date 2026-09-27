import { afterEach, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });
it("actual Supabase SSR recovery writes a PKCE verifier on the returned response", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://local-auth.invalid");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-only-anon");
  const network = vi.fn().mockResolvedValue(new Response("{}", { headers: { "Content-Type": "application/json" } }));
  vi.stubGlobal("fetch", network);
  vi.resetModules();
  const { createSupabaseRouteHandlerClient } = await import("@/lib/supabase/routeHandler");
  const response = NextResponse.json({ ok: true });
  const client = createSupabaseRouteHandlerClient(new NextRequest("https://maro.al/api/auth/forgot-password"), response);
  const { error } = await client.auth.resetPasswordForEmail("test@example.org", { redirectTo: "https://maro.al/auth/callback?type=recovery&next=%2Freset-password" });
  expect(error).toBeNull();
  expect(network).toHaveBeenCalledOnce();
  expect(response.cookies.getAll().some(cookie => cookie.name.includes("code-verifier"))).toBe(true);
  expect(String(network.mock.calls[0][0])).toContain("/auth/v1/recover");
});
it("ordinary regression fetch cannot reach remote auth or email", async () => {
  await expect(fetch("https://api.resend.com/emails", { method: "POST" })).rejects.toThrow("Regression network blocked");
  await expect(fetch("https://production.supabase.co/auth/v1/signup", { method: "POST" })).rejects.toThrow("Regression network blocked");
  expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBe("");
  expect(process.env.RESEND_API_KEY).toBe("");
});
