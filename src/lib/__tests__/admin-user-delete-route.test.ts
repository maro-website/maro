import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ auth: vi.fn(), mfa: vi.fn(), rpc: vi.fn(), remove: vi.fn(), deleteUser: vi.fn(), publications: vi.fn(), audit: vi.fn() }));
vi.mock("@/lib/admin/auth", () => ({ requirePermission: mock.auth }));
vi.mock("@/lib/admin/actionMfa", () => ({ verifyAdminActionMfa: mock.mfa }));
vi.mock("@/lib/admin/audit", () => ({ writeAuditEvent: mock.audit }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdmin: () => ({ rpc: mock.rpc, storage: { from: () => ({ remove: mock.remove }) }, auth: { admin: { deleteUser: mock.deleteUser } }, from: () => ({ delete: () => ({ eq: mock.publications }) }) }) }));
import { POST } from "@/app/api/admin/users/delete/route";
const actor = "11111111-1111-4111-8111-111111111111", userId = "22222222-2222-4222-8222-222222222222";
const request = (extra = {}) => new Request("http://localhost/api/admin/users/delete", { method: "POST", body: JSON.stringify({ userId, email: "owner@example.invalid", mfaCode: "123456", ...extra }) });
beforeEach(() => {
  vi.clearAllMocks(); mock.auth.mockResolvedValue({ ok: true, admin: { userId: actor }, requestId: "test-request" }); mock.mfa.mockResolvedValue(null);
  mock.rpc.mockImplementation((name: string) => name === "admin_begin_user_delete" ? Promise.resolve({ data: { ok: true }, error: null }) : { range: async (offset: number) => ({ data: offset === 0 ? Array.from({ length: 500 }, (_, index) => ({ bucket_id: "generations", name: `${userId}/${index}.png` })) : Array.from({ length: 200 }, (_, index) => ({ bucket_id: "generations", name: `${userId}/${index + 500}.png` })), error: null }) });
  mock.remove.mockResolvedValue({ error: null }); mock.publications.mockResolvedValue({ error: null }); mock.deleteUser.mockResolvedValue({ error: null });
});
describe("MFA account deletion workflow", () => {
  it("checks fresh MFA before mutation and rejects forged actors", async () => {
    mock.mfa.mockResolvedValue(Response.json({ error: "mfa_code_invalid" }, { status: 403 })); expect((await POST(request())).status).toBe(403); expect(mock.rpc).not.toHaveBeenCalled();
    expect((await POST(request({ actorId: userId }))).status).toBe(400);
  });
  it("removes all paginated objects in bounded batches before Auth deletion and records the actor", async () => {
    expect((await POST(request())).status).toBe(200); expect(mock.remove).toHaveBeenCalledTimes(7); expect(mock.remove.mock.calls.flatMap(call => call[0])).toHaveLength(700);
    expect(mock.rpc).toHaveBeenCalledWith("admin_begin_user_delete", { p_actor: actor, p_user: userId, p_email: "owner@example.invalid" }); expect(mock.deleteUser).toHaveBeenCalledExactlyOnceWith(userId, false);
    expect(mock.audit).toHaveBeenCalledWith(expect.objectContaining({ actorId: actor, action: "users.deleted" }));
  });
  it("never deletes the Auth account when storage cleanup fails", async () => {
    mock.remove.mockResolvedValueOnce({ error: { message: "test failure" } }); const response = await POST(request());
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ error: "delete_cleanup_pending" }); expect(mock.deleteUser).not.toHaveBeenCalled();
  });
  it("preserves protected accounts and active work as denied by the transactional guard", async () => {
    mock.rpc.mockResolvedValueOnce({ data: { ok: false, error: "protected_account" }, error: null }); expect((await POST(request())).status).toBe(409); expect(mock.remove).not.toHaveBeenCalled(); expect(mock.deleteUser).not.toHaveBeenCalled();
  });
});
