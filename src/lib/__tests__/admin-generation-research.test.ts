import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  role: "super_admin", mfa: true, signedIn: true, from: vi.fn(), rpc: vi.fn(), audit: vi.fn(), rate: vi.fn(),
  rows: {} as Record<string, unknown>, failedTable: "", filters: [] as Array<[string, string, unknown]>,
}));
vi.mock("@/lib/admin/mfa", () => ({ assertAdminMfa: async () => mock.mfa ? { ok: true } : { ok: false, reason: "mfa_challenge_required" } }));
vi.mock("@/lib/security/rateLimit", () => ({ checkRateLimit: mock.rate }));
vi.mock("@/lib/supabase/server", () => ({
  getUserFromToken: async () => mock.signedIn ? { id: "admin" } : null,
  getProfileCredits: async () => ({ access_role: mock.role }),
  getSupabaseAdmin: () => ({ from: mock.from, rpc: mock.rpc }),
}));
import { GET } from "@/app/api/admin/v1/operations/[jobId]/details/route";
import { GET as list } from "@/app/api/admin/v1/operations/route";
import { generationResearchSummaries } from "@/lib/admin/generationResearch";
import { GenerationResearchContent } from "@/components/admin/v1/GenerationResearchDetails";
import { AdminPrivateValue, AdminPrivacyProvider } from "@/components/admin/AdminPrivacy";

const id = "11111111-1111-4111-8111-111111111111", owner = "22222222-2222-4222-8222-222222222222";
const original = "  Krijo një reklamë\nRuaje produktin.  ", compiled = "  Exact provider instructions\nPrivate brain context.  ";
const request = (jobId = id) => GET(new Request(`https://maro.test/api/admin/v1/operations/${jobId}/details`, { headers: { Authorization: "Bearer test" } }), { params: Promise.resolve({ jobId }) });
const listRequest = () => list(new Request("https://maro.test/api/admin/v1/operations", { headers: { Authorization: "Bearer test" } }));

beforeEach(() => {
  vi.clearAllMocks(); mock.role = "super_admin"; mock.mfa = true; mock.signedIn = true; mock.failedTable = ""; mock.filters = [];
  mock.rows = {
    generation_jobs: { id, user_id: owner, created_at: "2026-10-28T12:00:00Z", status: "completed", credits_charged: 5, credits_reserved: 0,
      prompt: original, metadata: { v1_durable: true, v1_request: { userId: owner, module: "maro_imazh", prompt: original,
        workspaceId: "workspace", selections: { format: "1:1", text: "off" }, useBrain: true, references: [{ id: "storage:generations/private-reference" }],
        model: { provider: "openai", providerModelId: "image-model", customerCredits: 5 } },
        execution: { image_provider: { usage: { input_tokens: 20, output_tokens: 30, secret: "DO_NOT_RETURN" }, estimate: { usd: 0.02 },
          error: { code: "test_code", status: 400, message: "DO_NOT_RETURN" }, response: { url: "DO_NOT_RETURN" } } }, secret: "DO_NOT_RETURN" } },
    profiles: { id: owner, email: "arta@example.test", full_name: "Arta", credits: 100, created_at: "2026-10-01T12:00:00Z" },
    pricing_snapshots: { id: "trace", snapshot: { request: { userId: owner }, canonical: { prompt: compiled, provenance: { brainUsed: true, system: { version: "v1" } }, secret: "DO_NOT_RETURN" } } },
    generations: { id: "generation" }, memberships: { plan_id: "pro", expires_at: "2026-11-28T12:00:00Z" },
    workspaces: { id: "workspace", name: "Brand" },
  };
  mock.rate.mockResolvedValue({ allowed: true }); mock.audit.mockResolvedValue({ error: null });
  mock.rpc.mockResolvedValue({ data: { counts: {}, jobs: [{ id, userId: owner, status: "completed" }], recentReconciliation: [] }, error: null });
  mock.from.mockImplementation((table: string) => {
    let many = false, head = false;
    const result = () => ({ data: head ? null : many ? [mock.rows[table]].filter(Boolean) : mock.rows[table] ?? null,
      count: head ? 23 : null, error: mock.failedTable === table ? { message: "DO_NOT_RETURN" } : null });
    const q = {
      select: (_columns: string, options?: { head?: boolean }) => { head = options?.head ?? false; return q; },
      eq: (key: string, value: unknown) => { mock.filters.push([table, key, value]); return q; },
      in: () => { many = true; return q; }, lte: () => q, gt: () => q, order: () => q, limit: () => q,
      maybeSingle: async () => result(), insert: mock.audit,
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve),
    };
    return q;
  });
});

describe("generation research boundaries", () => {
  it.each(["administrator", "developer", "editor"])("denies %s before reading identities, prompts or traces", async role => {
    mock.role = role; expect((await request()).status).toBe(403); expect(mock.from).not.toHaveBeenCalled(); expect(mock.rate).not.toHaveBeenCalled();
  });
  it("requires sign-in, fresh MFA, a valid ID and strict throttling", async () => {
    mock.signedIn = false; expect((await request()).status).toBe(403);
    mock.signedIn = true; mock.mfa = false; expect((await request()).status).toBe(403);
    mock.mfa = true; expect((await request("not-a-job")).status).toBe(400); expect(mock.from).not.toHaveBeenCalled();
    mock.rate.mockResolvedValue({ allowed: false, retryAfter: 15 }); const response = await request();
    expect(response.status).toBe(429); expect(response.headers.get("Retry-After")).toBe("15"); expect(mock.from).not.toHaveBeenCalled();
  });
  it("returns exact original/provider text with owner-scoped history and trace, and an audited access", async () => {
    const response = await request(), data = await response.json(); expect(response.status).toBe(200);
    expect(data).toMatchObject({ userId: owner, originalPrompt: original, providerPrompt: compiled, user: { name: "Arta", email: "arta@example.test", currentPlan: "pro", recordedGenerations: 23 },
      workspace: { name: "Brand" }, referenceCount: 1, selections: { text: "off" }, brainUsed: true, estimatedCostUsd: 0.02 });
    expect(JSON.stringify(data)).not.toContain("DO_NOT_RETURN"); expect(JSON.stringify(data)).not.toContain("storage:");
    for (const table of ["generations", "pricing_snapshots"]) {
      expect(mock.filters).toContainEqual([table, "job_id", id]); expect(mock.filters).toContainEqual([table, "user_id", owner]);
    }
    expect(mock.filters).toContainEqual(["workspaces", "owner_id", owner]);
    expect(mock.audit).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ action: "v1.generation_research.viewed", actor_id: "admin", target_id: id }));
    expect(JSON.stringify(mock.audit.mock.calls)).not.toContain(compiled);
    expect(response.headers.get("Cache-Control")).toContain("private, no-store"); expect(response.headers.get("Vary")).toBe("Authorization");
  });
  it("does not fabricate a missing prompt or use a foreign trace", async () => {
    for (const trace of [null, { snapshot: { request: { userId: "other" }, canonical: { prompt: "FOREIGN" } } }]) {
      mock.rows.pricing_snapshots = trace; const data = await (await request()).json();
      expect(data.providerPrompt).toBeNull(); expect(data.traceAvailable).toBe(false); expect(JSON.stringify(data)).not.toContain("FOREIGN");
    }
  });
  it("handles missing profiles, history, memberships and workspace without inventing identities", async () => {
    for (const table of ["profiles", "generations", "memberships", "workspaces"]) mock.rows[table] = null;
    const response = await request(); expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ userId: owner, user: { profileAvailable: false, email: null, currentPlan: null }, generationId: null, workspace: null });
  });
  it("fails closed for audit failure and sanitizes query failures", async () => {
    mock.audit.mockResolvedValue({ error: true }); let response = await request(); expect(response.status).toBe(503); expect(await response.json()).toEqual({ error: "research_audit_unavailable" });
    mock.failedTable = "pricing_snapshots"; response = await request(); expect(response.status).toBe(503); expect(await response.text()).not.toContain("DO_NOT_RETURN");
  });
  it("rejects missing and unsupported jobs", async () => {
    mock.rows.generation_jobs = null; expect((await request()).status).toBe(404);
    mock.rows.generation_jobs = { id, user_id: owner, metadata: { v1_durable: true, v1_request: { module: "maro_web" } } }; expect((await request()).status).toBe(404);
  });
});

describe("bounded research list and presentation", () => {
  it.each(["administrator", "developer"])("keeps %s operational results free of research data", async role => {
    mock.role = role; const response = await listRequest(); expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ canResearch: false, jobs: [{ id, userId: owner }] }); expect(mock.from).not.toHaveBeenCalled();
  });
  it("joins only each row's owner, preserving operational fields and bounding the prompt preview", async () => {
    (mock.rows.generation_jobs as Record<string, unknown>).prompt = "a".repeat(1000);
    const response = await listRequest(); expect(response.status).toBe(200);
    expect((await response.json()).jobs[0]).toMatchObject({ id, status: "completed", researcher: { email: "arta@example.test", promptPreview: "a".repeat(180) } });
    (mock.rows.profiles as Record<string, unknown>).id = "other";
    (mock.rows.generation_jobs as Record<string, unknown>).user_id = "other";
    const rows = await generationResearchSummaries([{ id, userId: owner }], { actorId: "admin", requestId: "test" }); expect(rows[0].researcher.email).toBeNull(); expect(rows[0].researcher.promptPreview).toBeNull();
  });
  it("preserves operations if research lookup is unavailable", async () => {
    mock.failedTable = "profiles"; const response = await listRequest(); expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ researchUnavailable: true, jobs: [{ status: "completed" }] });
  });
  it("keeps research text out of masked HTML", async () => {
    const data = await (await request()).json();
    const content = React.createElement(GenerationResearchContent, { data });
    expect(renderToStaticMarkup(content)).toContain("arta@example.test");
    const masked = renderToStaticMarkup(React.createElement(AdminPrivacyProvider, { account: "admin" }, React.createElement(AdminPrivateValue, null, content)));
    expect(masked).toContain("*****"); expect(masked).not.toContain("arta@example.test"); expect(masked).not.toContain("Exact provider instructions");
  });
});
