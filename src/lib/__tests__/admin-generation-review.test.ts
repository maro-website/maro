import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

const mock = vi.hoisted(() => ({
  role: "super_admin", signedIn: true, mfa: true,
  from: vi.fn(), storage: vi.fn(), download: vi.fn(), audit: vi.fn(), rate: vi.fn(), rpc: vi.fn(),
  job: {} as Record<string, unknown>, generation: {} as Record<string, unknown> | null,
  jobError: false, generationError: false, filters: [] as Array<[string, string, unknown]>,
}));
vi.mock("@/lib/admin/mfa", () => ({ assertAdminMfa: async () => mock.mfa ? { ok: true } : { ok: false, reason: "mfa_challenge_required" } }));
vi.mock("@/lib/security/rateLimit", () => ({ checkRateLimit: mock.rate }));
vi.mock("@/lib/supabase/server", () => ({
  getUserFromToken: async (token: string | null) => mock.signedIn && token ? { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" } : null,
  getProfileCredits: async () => ({ access_role: mock.role }),
  getSupabaseAdmin: () => ({ from: mock.from, storage: { from: mock.storage }, rpc: mock.rpc }),
}));
import { GET } from "@/app/api/admin/v1/operations/[jobId]/image/route";
import { GET as listOperations } from "@/app/api/admin/v1/operations/route";
import { hasPermission, type AccessRole } from "@/lib/admin/permissions";

const jobId = "11111111-1111-4111-8111-111111111111";
const owner = "22222222-2222-4222-8222-222222222222";
const generationId = "33333333-3333-4333-8333-333333333333";
const path = `${owner}/${jobId}/output.png`;
let original: Buffer;
const request = (variant = "thumbnail", id = jobId, authenticated = true) => GET(new Request(`https://maro.test/api/admin/v1/operations/${id}/image?variant=${variant}`, {
  headers: authenticated ? { Authorization: "Bearer unit-test-only", "x-request-id": "quality-review-test" } : {},
}), { params: Promise.resolve({ jobId: id }) });

beforeEach(async () => {
  vi.clearAllMocks(); mock.role = "super_admin"; mock.signedIn = true; mock.mfa = true;
  mock.jobError = false; mock.generationError = false; mock.filters = [];
  mock.job = { id: jobId, user_id: owner, metadata: { v1_durable: true, v1_request: { module: "maro_imazh", prompt: "Must never leave server" } } };
  mock.generation = { id: generationId, output_urls: [`storage:generations/${path}`] };
  original = await sharp({ create: { width: 400, height: 800, channels: 4, background: { r: 20, g: 100, b: 60, alpha: 1 } } }).png().toBuffer();
  mock.download.mockResolvedValue({ data: new Blob([new Uint8Array(original)], { type: "image/png" }), error: null });
  mock.storage.mockReturnValue({ download: mock.download });
  mock.audit.mockResolvedValue({ error: null });
  mock.rate.mockResolvedValue({ allowed: true, retryAfter: 0 });
  mock.rpc.mockResolvedValue({ data: { counts: {}, jobs: [], recentReconciliation: [] }, error: null });
  mock.from.mockImplementation(table => {
    const q = { select: () => q, eq: (key: string, value: unknown) => { mock.filters.push([table, key, value]); return q; },
      maybeSingle: async () => ({ data: table === "generation_jobs" ? mock.job : mock.generation, error: table === "generation_jobs" ? mock.jobError : mock.generationError }),
      insert: mock.audit };
    return q;
  });
});

describe("generation review authorization", () => {
  it.each(["super_admin", "administrator", "developer"] as AccessRole[])("returns only a server-derived preview capability to %s without loading images", async role => {
    mock.role = role;
    const response = await listOperations(new Request("https://maro.test/api/admin/v1/operations?canReviewImages=true", { headers: { Authorization: "Bearer unit-test-only" } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ counts: {}, jobs: [], recentReconciliation: [], canReviewImages: role === "super_admin" });
    expect(mock.storage).not.toHaveBeenCalled(); expect(mock.from).not.toHaveBeenCalled();
  });
  it.each(["administrator", "developer", "editor"] as AccessRole[])("keeps private image review out of %s", async role => {
    mock.role = role;
    expect(hasPermission(role, "operations.view")).toBe(role !== "editor");
    expect(hasPermission(role, "generations.review")).toBe(false);
    const response = await request(); expect(response.status).toBe(403);
    expect(mock.from).not.toHaveBeenCalled(); expect(mock.storage).not.toHaveBeenCalled(); expect(mock.rate).not.toHaveBeenCalled();
  });
  it("denies missing authentication and MFA before database or storage work", async () => {
    expect((await request("original", jobId, false)).status).toBe(403);
    mock.mfa = false;
    const response = await request(); expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "mfa_challenge_required" });
    expect(mock.from).not.toHaveBeenCalled(); expect(mock.storage).not.toHaveBeenCalled();
  });
  it("rechecks permissions and MFA for the original after an authorized thumbnail", async () => {
    expect((await request()).status).toBe(200);
    mock.storage.mockClear(); mock.from.mockClear(); mock.mfa = false;
    expect((await request("original")).status).toBe(403); expect(mock.storage).not.toHaveBeenCalled(); expect(mock.from).not.toHaveBeenCalled();
  });
  it.each([["thumbnail", "../private"], ["full", jobId], ["https://elsewhere.test/photo", jobId]])("rejects variant %s and ID %s before storage", async (variant, id) => {
    expect((await request(variant, id)).status).toBe(400); expect(mock.from).not.toHaveBeenCalled();
  });
  it("uses strict per-admin throttling before reading images", async () => {
    mock.rate.mockResolvedValue({ allowed: false, retryAfter: 35 });
    const response = await request(); expect(response.status).toBe(429); expect(response.headers.get("Retry-After")).toBe("35");
    expect(mock.rate).toHaveBeenCalledWith("admin_generation_review", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", 120, 60, "strict");
    expect(mock.from).not.toHaveBeenCalled(); expect(mock.download).not.toHaveBeenCalled();
  });
});

describe("private output integrity and access auditing", () => {
  it("creates a real 96px thumbnail in memory, not a CSS-shrunken original", async () => {
    const response = await request(); expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    const thumbnail = Buffer.from(await response.arrayBuffer());
    expect(await sharp(thumbnail).metadata()).toMatchObject({ width: 48, height: 96 });
    expect(mock.storage).toHaveBeenCalledExactlyOnceWith("generations"); expect(mock.download).toHaveBeenCalledExactlyOnceWith(path);
    expect(mock.filters).toContainEqual(["generations", "job_id", jobId]); expect(mock.filters).toContainEqual(["generations", "user_id", owner]);
    expect(mock.audit).toHaveBeenCalledExactlyOnceWith({ actor_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", action: "v1.generation_image.viewed", target_type: "generation_job", target_id: jobId,
      request_id: "quality-review-test", metadata: { purpose: "quality_review", variant: "thumbnail", generationId } });
    expect(response.headers.get("Cache-Control")).toContain("no-store"); expect(response.headers.get("Vary")).toBe("Authorization");
    expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe("same-origin"); expect(response.headers.has("Location")).toBe(false);
  });
  it("returns original bytes without compression, copying to public storage or issuing public URLs", async () => {
    const response = await request("original"); expect(response.status).toBe(200); expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(original);
    expect(response.headers.get("Content-Disposition")).toBe(`inline; filename="maro-generation-${jobId}.png"`);
    expect(mock.audit.mock.calls[0][0].metadata.variant).toBe("original");
  });
  it.each(["maro_logo", "maro_imazh"])("permits stored %s results", async module => {
    mock.job.metadata = { v1_durable: true, v1_request: { module } }; expect((await request()).status).toBe(200);
  });
  it.each([null, { id: generationId, output_urls: [] }, { id: generationId, output_urls: [`storage:generations/${owner}/reference.png`] }, { id: generationId, output_urls: ["https://remote.test/image.png"] }])("never resurrects removed outputs or reads unrelated references: %j", async generation => {
    mock.generation = generation; expect((await request()).status).toBe(404); expect(mock.download).not.toHaveBeenCalled(); expect(mock.audit).not.toHaveBeenCalled();
  });
  it("denies malformed owners and non-V1 jobs without storage reads", async () => {
    mock.job.user_id = "../another-user"; expect((await request()).status).toBe(404);
    mock.job.user_id = owner; mock.job.metadata = { v1_durable: true, v1_request: { module: "maro_web" } };
    expect((await request()).status).toBe(404); expect(mock.download).not.toHaveBeenCalled();
  });
  it("fails closed when auditing returns an error or throws", async () => {
    mock.audit.mockResolvedValueOnce({ error: { message: "private database diagnostic" } });
    let response = await request("original"); expect(response.status).toBe(503); expect(await response.json()).toEqual({ error: "review_audit_unavailable" });
    mock.audit.mockRejectedValueOnce(new Error("private connection error"));
    response = await request(); expect(response.status).toBe(503); expect(await response.json()).toEqual({ error: "review_unavailable" });
  });
  it("handles missing files and database outages without leaking source data", async () => {
    mock.jobError = true; let response = await request(); expect(response.status).toBe(503); expect(mock.download).not.toHaveBeenCalled();
    mock.jobError = false; mock.generationError = true; expect((await request()).status).toBe(503); expect(mock.download).not.toHaveBeenCalled();
    mock.generationError = false; mock.download.mockResolvedValueOnce({ data: null, error: { message: "storage credentials and path" } });
    response = await request(); expect(response.status).toBe(404); expect(await response.json()).toEqual({ error: "image_unavailable" });
  });
  it("rejects executable, malformed and oversized data without recording a completed view", async () => {
    for (const data of [new Blob(["<svg onload='bad'>"]), new Blob([new Uint8Array([137, 80, 78, 71, 0, 0, 0, 0])]), { size: 16 * 1024 * 1024, arrayBuffer: vi.fn() }]) {
      mock.download.mockResolvedValueOnce({ data, error: null }); expect((await request()).status).toBe(422);
    }
    expect(mock.audit).not.toHaveBeenCalled();
  });
  it("validates malformed originals as well as thumbnails", async () => {
    mock.download.mockResolvedValueOnce({ data: new Blob([new Uint8Array([137, 80, 78, 71, 0, 0, 0, 0])]), error: null });
    expect((await request("original")).status).toBe(422); expect(mock.audit).not.toHaveBeenCalled();
  });
});
