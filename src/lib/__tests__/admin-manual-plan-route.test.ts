import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  role: "administrator", signedIn: true, mfa: true,
  rpc: vi.fn(), from: vi.fn(), tables: {} as Record<string, { data: unknown[]; error: unknown }>,
}));
vi.mock("@/lib/admin/mfa", () => ({ assertAdminMfa: async () => mock.mfa ? { ok: true } : { ok: false, reason: "mfa_challenge_required" } }));
vi.mock("@/lib/supabase/server", () => ({
  supabaseServerConfigured: () => true,
  getUserFromToken: async () => mock.signedIn ? { id: "11111111-1111-4111-8111-111111111111" } : null,
  getProfileCredits: async () => ({ access_role: mock.role }),
  getSupabaseAdmin: () => ({ from: mock.from, rpc: mock.rpc }),
}));
import { GET, POST } from "@/app/api/admin/users/plan/route";

const userId = "22222222-2222-4222-8222-222222222222";
const grantId = "33333333-3333-4333-8333-333333333333";
const body = { userId, grantId, planId: "pro", durationDays: 30, note: "Plan i falur" };
const post = (payload: unknown = body) => POST(new Request("http://localhost/api/admin/users/plan", {
  method: "POST", headers: { Authorization: "Bearer test-only" }, body: JSON.stringify(payload),
}));
const get = () => GET(new Request(`http://localhost/api/admin/users/plan?userId=${userId}`, {
  headers: { Authorization: "Bearer test-only" },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mock.role = "administrator"; mock.signedIn = true; mock.mfa = true;
  mock.tables = {
    commerce_plans: { data: [{ id: "pro", display_name: "maroPro", duration_days: 30 }], error: null },
    memberships: { data: [{ id: grantId, plan_id: "pro", started_at: "2026-10-05", expires_at: "2026-11-04", suspended: false }], error: null },
    audit_events: { data: [{ target_id: grantId, metadata: { note: "Arsye vetëm për admin", actor_email: "admin@example.invalid" }, created_at: "2026-10-05" }], error: null },
    credit_orders: { data: [], error: null },
  };
  mock.from.mockImplementation((table: string) => {
    const q = { select: () => q, eq: () => q, in: () => q, order: () => q, limit: () => q,
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(mock.tables[table]).then(resolve) };
    return q;
  });
  mock.rpc.mockResolvedValue({ data: { ok: true, already: false, membership_id: grantId, expires_at: "2026-11-04" }, error: null });
});

describe("manual plan admin endpoint", () => {
  it("uses the authenticated actor and an access-only RPC", async () => {
    expect((await post()).status).toBe(200);
    expect(mock.rpc).toHaveBeenCalledExactlyOnceWith("admin_grant_plan", {
      p_actor: "11111111-1111-4111-8111-111111111111", p_user: userId,
      p_plan: "pro", p_duration_days: 30, p_note: "Plan i falur", p_grant_id: grantId,
    });
    expect(mock.from).not.toHaveBeenCalled();
  });

  it.each(["developer", "editor"])("%s cannot grant a plan", async role => {
    mock.role = role;
    expect((await post()).status).toBe(403);
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it("denies missing MFA and public access before reading private comments or mutating plans", async () => {
    mock.mfa = false;
    expect((await get()).status).toBe(403);
    expect((await post()).status).toBe(403);
    mock.mfa = true; mock.signedIn = false;
    expect((await get()).status).toBe(403);
    expect((await post()).status).toBe(403);
    expect(mock.rpc).not.toHaveBeenCalled();
    expect(mock.from).not.toHaveBeenCalled();
  });

  it.each([
    { ...body, planId: "fort" }, { ...body, durationDays: 0 }, { ...body, durationDays: 366 },
    { ...body, durationDays: 1.5 }, { ...body, note: "  " }, { ...body, grantId: "invalid" },
    { ...body, actorId: userId }, { ...body, credits: 500 }, null,
  ])("rejects invalid or forged grant data", async payload => {
    expect((await post(payload)).status).toBe(400);
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it("returns a conflict for existing plans and a clear setup error when the RPC is missing", async () => {
    mock.rpc.mockResolvedValueOnce({ data: { ok: false, error: "existing_plan" }, error: null });
    expect((await post()).status).toBe(409);
    mock.rpc.mockResolvedValueOnce({ data: null, error: { code: "PGRST202" } });
    const res = await post();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "rpc_missing" });
  });

  it("returns private manual provenance only through the protected admin API", async () => {
    const res = await get();
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(await res.json()).toMatchObject({ canManage: true, memberships: [{
      source: "manual", note: "Arsye vetëm për admin", actorEmail: "admin@example.invalid",
    }] });
    mock.role = "developer";
    expect(await (await get()).json()).toMatchObject({ canManage: false });
  });

  it("distinguishes real paid orders from tests and unattributed memberships", async () => {
    mock.tables.audit_events.data = [];
    mock.tables.credit_orders.data = [{ membership_id: grantId, amount_cents: 3500, provider: "test" }];
    expect(await (await get()).json()).toMatchObject({ memberships: [{ source: "other", note: null }] });
    mock.tables.credit_orders.data = [{ membership_id: grantId, amount_cents: 3500, provider: "raiffeisen" }];
    expect(await (await get()).json()).toMatchObject({ memberships: [{ source: "paid", note: null }] });
    mock.tables.audit_events.error = { message: "unavailable" };
    expect((await get()).status).toBe(500);
  });
});
