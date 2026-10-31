import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ role: "super_admin", signedIn: true, mfa: true, rate: vi.fn(), rpc: vi.fn(), audit: vi.fn() }));
vi.mock("@/lib/admin/mfa", () => ({ assertAdminMfa: async () => mock.mfa ? { ok: true } : { ok: false, reason: "mfa_challenge_required" } }));
vi.mock("@/lib/security/rateLimit", () => ({ checkRateLimit: mock.rate }));
vi.mock("@/lib/supabase/server", () => ({
  getUserFromToken: async () => mock.signedIn ? { id: "admin" } : null,
  getProfileCredits: async () => ({ access_role: mock.role }),
  getSupabaseAdmin: () => ({ rpc: mock.rpc, from: () => ({ insert: mock.audit }) }),
}));
import { GET } from "@/app/api/admin/optimizer-usage/route";
const request = () => GET(new Request("https://maro.test/api/admin/optimizer-usage", { headers: { Authorization: "Bearer test" } }));
beforeEach(() => {
  vi.clearAllMocks(); mock.role = "super_admin"; mock.signedIn = true; mock.mfa = true;
  mock.rate.mockResolvedValue({ allowed: true }); mock.audit.mockResolvedValue({ error: null });
  mock.rpc.mockResolvedValue({ data: [{ user_id: "owner", email: "owner@test.invalid", estimated_usd: 0.02, unconfirmed_reserved_usd: 0.2 }] });
});
describe("optimizer cost reporting authorization", () => {
  it.each(["administrator", "developer", "editor"])("denies %s before any identity/cost read", async role => {
    mock.role = role; expect((await request()).status).toBe(403); expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("requires login and MFA and fails closed when rate limited", async () => {
    mock.signedIn = false; expect((await request()).status).toBe(403);
    mock.signedIn = true; mock.mfa = false; expect((await request()).status).toBe(403);
    mock.mfa = true; mock.rate.mockResolvedValue({ allowed: false, retryAfter: 20 });
    const response = await request(); expect(response.status).toBe(429); expect(response.headers.get("Retry-After")).toBe("20");
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("returns private non-cacheable per-user estimates only after an audit receipt", async () => {
    const response = await request(); expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ keyAlias: "maro_optimizer", users: [{ estimated_usd: 0.02, unconfirmed_reserved_usd: 0.2 }] });
    expect(mock.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "optimizer.usage.viewed", actor_id: "admin" }));
    expect(response.headers.get("Cache-Control")).toBe("private, no-store"); expect(response.headers.get("Vary")).toBe("Authorization");
  });
  it("does not show zero spend or identities when accounting or audit is unavailable", async () => {
    mock.rpc.mockResolvedValueOnce({ error: { message: "PRIVATE" } });
    let response = await request(); expect(response.status).toBe(503); expect(await response.text()).not.toContain("PRIVATE");
    mock.audit.mockResolvedValueOnce({ error: true }); response = await request(); expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("owner@test.invalid");
  });
});
