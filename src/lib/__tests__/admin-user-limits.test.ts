import { beforeEach, describe, expect, it, vi } from "vitest";
import { storageLimitSchema, userLimitPayload, workspaceLimitSchema } from "@/lib/admin/userLimits";
const m = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/admin/auth", () => ({ requirePermission: m.auth }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdmin: () => ({ rpc: m.rpc }) }));
import { POST as storage } from "@/app/api/admin/users/storage/route";
import { POST as workspaces } from "@/app/api/admin/users/workspaces/route";
import { getWorkspaceLimit } from "@/lib/workspaces/limitServer";
const userId = "22222222-2222-4222-8222-222222222222";
const request = (body: unknown) => new Request("http://localhost/api/admin/users/limits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
beforeEach(() => { vi.resetAllMocks(); m.auth.mockResolvedValue({ ok: true, admin: { userId: "admin" } }); m.rpc.mockResolvedValue({ data: { ok: true }, error: null }); });

describe("admin limit form/API contract", () => {
  it("saves the exact 6 GB / test input from the reported screenshot through the real API", async () => {
    const payload = userLimitPayload("storage", userId, "6", false, "test");
    expect(payload.success).toBe(true);
    if (!payload.success) throw new Error("form_invalid");
    expect(storageLimitSchema.safeParse(payload.data).success).toBe(true);
    expect((await storage(request(payload.data))).status).toBe(200);
    expect(m.auth).toHaveBeenCalledWith(expect.any(Request), "users.manage");
    expect(m.rpc).toHaveBeenCalledWith("admin_set_user_storage", { p_actor: "admin", p_user: userId, p_limit_bytes: 6_000_000_000, p_note: "test" });
  });
  it.each(["0", "0.25", "1000"])("accepts storage in GB including large byte values: %s", amount => {
    expect(userLimitPayload("storage", userId, amount, false, "Support").success).toBe(true);
  });
  it.each(["", "NaN", "Infinity", "-1", "-0.00000000001", "1000.01"])("rejects invalid storage: %s", amount => {
    expect(userLimitPayload("storage", userId, amount, false, "Support").success).toBe(false);
  });
  it.each(["0", "-1", "1.5", "1001", "", "Infinity"])("rejects invalid workspace counts: %s", amount => {
    expect(userLimitPayload("workspaces", userId, amount, false, "Support").success).toBe(false);
  });
  it.each(["storage", "workspaces"] as const)("restores %s plan limits even with an empty disabled field", kind => {
    const payload = userLimitPayload(kind, userId, "", true, "  Restore plan  ");
    expect(payload.success).toBe(true);
    if (payload.success) expect(payload.data).toEqual({ userId, reason: "Restore plan", [kind === "storage" ? "limitBytes" : "limit"]: null });
  });
  it("saves a workspace override with the same permission and audit contract", async () => {
    const payload = userLimitPayload("workspaces", userId, "25", false, "Owner allowance");
    if (!payload.success) throw new Error("form_invalid");
    expect(workspaceLimitSchema.safeParse(payload.data).success).toBe(true);
    expect((await workspaces(request(payload.data))).status).toBe(200);
    expect(m.rpc).toHaveBeenCalledWith("admin_set_user_workspaces", { p_actor: "admin", p_user: userId, p_limit: 25, p_note: "Owner allowance" });
  });
  it.each([storage, workspaces])("keeps admin permissions and MFA ahead of every mutation", async route => {
    for (const error of ["forbidden", "insufficient_permission", "mfa_challenge_required"]) {
      m.auth.mockResolvedValue({ ok: false, status: 403, error });
      const response = await route(request({}));
      expect(response.status).toBe(403); expect(await response.json()).toEqual({ error });
    }
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it.each([storage, workspaces])("rejects malformed and legacy note payloads before writes", async route => {
    expect((await route(request({ userId, limitBytes: 6e9, limit: 5, note: "test" }))).status).toBe(400);
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it("reports missing migration and unknown users honestly", async () => {
    m.rpc.mockResolvedValueOnce({ error: { code: "PGRST202" } });
    const body = { userId, limit: 10, reason: "Support" };
    expect(await (await workspaces(request(body))).json()).toEqual({ error: "rpc_missing" });
    m.rpc.mockResolvedValueOnce({ data: { ok: false, error: "user_not_found" }, error: null });
    expect((await workspaces(request(body))).status).toBe(404);
  });
  it("reads the authoritative workspace calculator and fails closed on invalid/unavailable quotas", async () => {
    m.rpc.mockResolvedValueOnce({ data: 25, error: null });
    expect(await getWorkspaceLimit(userId)).toBe(25);
    expect(m.rpc).toHaveBeenCalledWith("resolve_workspace_limit", { p_user_id: userId });
    for (const result of [{ data: 0 }, { data: "25" }, { data: null }, { error: { code: "offline" } }]) {
      m.rpc.mockResolvedValueOnce(result);
      await expect(getWorkspaceLimit(userId)).rejects.toThrow("workspace_limit_unavailable");
    }
  });
});
