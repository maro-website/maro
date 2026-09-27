import { beforeEach, describe, expect, it, vi } from "vitest";
import { modelRow } from "./helpers/v1ImageFixtures";
const mock = vi.hoisted(() => ({ role: "administrator", mfa: true, signedIn: true, rows: [] as unknown[], rpc: vi.fn(), from: vi.fn(), job: {} as Record<string, unknown>, prompt: {} as Record<string, unknown> }));
vi.mock("@/lib/admin/mfa", () => ({ assertAdminMfa: async () => mock.mfa ? { ok: true } : { ok: false, reason: "mfa_challenge_required" } }));
vi.mock("@/lib/admin/audit", () => ({ writeAuditEvent: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  supabaseServerConfigured: () => true,
  getUserFromToken: async () => mock.signedIn ? { id: "admin", email: "admin@test.invalid" } : null,
  getProfileCredits: async () => ({ access_role: mock.role }),
  getSupabaseAdmin: () => ({ from: mock.from, rpc: mock.rpc }),
}));
import { GET as configGet } from "@/app/api/admin/v1/configuration/route";
import { GET as opsGet, POST as reconcile } from "@/app/api/admin/v1/operations/route";
import { GET as logoGet, PUT as logoSave } from "@/app/api/admin/v1/logo-content/route";
import { POST as modelsSave } from "@/app/api/admin/engine/tools/[toolId]/models/route";
import { POST as layersSave } from "@/app/api/admin/engine/tools/[toolId]/prompt-layers/route";
import { POST as publish } from "@/app/api/admin/engine/system-prompts/[id]/publish/route";
import { POST as preview } from "@/app/api/admin/engine/compile/route";
import { validateV1ModelSet, publicV1ImageModel } from "@/lib/engine/v1ImageModels";
import { updateDraftContent } from "@/lib/engine/promptVersions";
const request = (body: unknown = {}) => new Request("http://localhost/api/admin/test", { method: "POST", headers: { Authorization: "Bearer unit-test-only" }, body: JSON.stringify(body) });
const id = "00000000-0000-4000-8000-000000000001";
const toolCtx = { params: Promise.resolve({ toolId: "maro_imazh" }) };
beforeEach(() => {
  vi.clearAllMocks(); mock.role = "administrator"; mock.mfa = true; mock.signedIn = true;
  mock.rows = [modelRow("flare", "maro_imazh", 5), modelRow("sunburst", "maro_imazh", 5)];
  mock.job = { status: "processing", created_at: new Date(Date.now() - 16 * 60000).toISOString(), metadata: { v1_durable: true } };
  mock.prompt = { id, tool_id: "maro_imazh", status: "draft", content: "Saved draft" };
  mock.from.mockImplementation((table) => { const q = { select: () => q, eq: () => q, in: () => q,
    maybeSingle: async () => ({ data: mock.prompt }), single: async () => ({ data: table === "generation_jobs" ? mock.job : mock.prompt }),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: mock.rows }).then(resolve) }; return q; });
  mock.rpc.mockResolvedValue({ data: "finalized", error: null });
});
const routes = [
  ["configuration", () => configGet(request())], ["operations", () => opsGet(request())], ["Logo read", () => logoGet(request())],
  ["Logo save", () => logoSave(request())], ["models", () => modelsSave(request(), toolCtx)], ["layers", () => layersSave(request(), toolCtx)],
  ["publish", () => publish(request(), { params: Promise.resolve({ id }) })], ["preview", () => preview(request())], ["reconcile", () => reconcile(request({ jobId: id }))],
] as const;
describe("admin endpoints retain permission and MFA gates", () => {
  it.each(routes)("%s denies missing MFA before any database or provider work", async (_name, run) => { mock.mfa = false; const response = await run(); expect(response.status).toBe(403); expect(await response.json()).toMatchObject({ error: "mfa_challenge_required" }); expect(mock.from).not.toHaveBeenCalled(); expect(mock.rpc).not.toHaveBeenCalled(); });
  it.each(routes)("%s denies an editor without the required permission", async (_name, run) => { mock.role = "editor"; const response = await run(); expect(response.status).toBe(403); expect(mock.rpc).not.toHaveBeenCalled(); });
  it("rejects unauthenticated reconciliation", async () => { mock.signedIn = false; expect((await reconcile(request({ jobId: id }))).status).toBe(403); });
});
describe("authorized operational mutations", () => {
  it("sends the validated model set through the atomic configuration RPC", async () => {
    const models = validateV1ModelSet(mock.rows, "maro_imazh").map(publicV1ImageModel); models[0].customerCredits = 6;
    const response = await modelsSave(request({ models }), toolCtx); expect(response.status).toBe(200);
    expect(mock.rpc).toHaveBeenCalledWith("admin_save_v1_models", { p_tool: "maro_imazh", p_models: models });
  });
  it("rejects malformed model changes without database mutation", async () => { expect((await modelsSave(request({ models: [{ key: "sunburst" }] }), toolCtx)).status).toBe(400); expect(mock.rpc).not.toHaveBeenCalled(); });
  it("reconciliation delegates to the Phase 5 RPC using the fixed 15-minute threshold", async () => { const response = await reconcile(request({ jobId: id })); expect(response.status).toBe(200); expect(await response.json()).toEqual({ result: "finalized" }); expect(mock.rpc).toHaveBeenCalledExactlyOnceWith("reconcile_generation_job", { p_job_id: id, p_stale_minutes: 15 }); });
  it("recent and terminal jobs cannot trigger a settlement call", async () => {
    mock.job.created_at = new Date().toISOString(); expect((await reconcile(request({ jobId: id }))).status).toBe(400); expect(mock.rpc).not.toHaveBeenCalled();
    mock.job.status = "completed"; expect(await (await reconcile(request({ jobId: id }))).json()).toEqual({ result: "already_terminal" }); expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("empty publication is rejected before the atomic publisher", async () => { mock.prompt.content = " "; expect((await publish(request(), { params: Promise.resolve({ id }) })).status).toBe(400); expect(mock.rpc).not.toHaveBeenCalled(); });
  it("live and archived prompt bodies cannot be changed through draft edits", async () => { for (const status of ["live", "archived"]) { mock.prompt.status = status; await expect(updateDraftContent(id, { content: "overwrite" })).rejects.toThrow("cannot_edit_published_version"); } });
  it("a draft update cannot set live status to bypass publication", async () => { await expect(updateDraftContent(id, { status: "live" as "draft" })).rejects.toThrow("invalid_draft_status"); });
});
