import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { canUseMoods, MOOD_PRESERVATION } from "@/lib/moods/model";
import { parseV1ImageRequest, resolveV1ImageRequest } from "@/lib/generation/v1ImageRequest";
import { buildCanonicalImagePrompt, type ProductionImagePrompt } from "@/lib/generation/v1ImagePrompt";
import { resolveGenerationMood } from "@/lib/moods/server";
import { GET } from "@/app/api/moods/route";
import { POST as save } from "@/app/api/moods/save/route";
import { GET as adminGet } from "@/app/api/admin/moods/route";
import { POST as upload } from "@/app/api/admin/moods/upload/route";
import { modelRow, imazhRequest, logoRequest } from "./helpers/v1ImageFixtures";
import { ImageRequestValidationError } from "@/lib/generation/requestValidation";

const moodId = "c7130000-0000-4000-8000-000000000001";
const privatePrompt = "Make the scenery look like Halloween. PRIVATE MOOD INSTRUCTIONS";
const digest = (text: string) => createHash("sha256").update(text).digest("hex");
const mocks = vi.hoisted(() => ({ tokenUser: vi.fn(), account: vi.fn(), permission: vi.fn(), from: vi.fn(), mood: { id: "", title: "Halloween", prompt: "", active: true, status: "approved", visibility: "public", created_by: "owner" }, saved: [] as { mood_id: string }[], dbError: null as null | { code: string } }));
vi.mock("@/lib/supabase/server", () => ({
  getUserFromToken: mocks.tokenUser,
  getSupabaseAdmin: () => ({ auth: { admin: { getUserById: mocks.account } }, from: mocks.from }),
}));
vi.mock("@/lib/admin/auth", () => ({ requirePermission: mocks.permission }));
vi.mock("@/lib/admin/audit", () => ({ writeAuditEvent: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.tokenUser.mockResolvedValue({ id: "owner", email: "erzen@nice.al" });
  mocks.account.mockResolvedValue({ data: { user: { email: "erzen@nice.al" } }, error: null });
  mocks.permission.mockResolvedValue({ ok: true, admin: { userId: "owner" }, requestId: "test" });
  mocks.mood = { id: moodId, title: "Halloween", prompt: privatePrompt, active: true, status: "approved", visibility: "public", created_by: "owner" }; mocks.saved = []; mocks.dbError = null;
  mocks.from.mockImplementation((table: string) => {
    let columns = "";
    const query = { select: (value: string) => { columns = value; return query; }, eq: () => query, order: () => query, or: () => query, range: () => query, limit: () => query,
      maybeSingle: async () => ({ data: mocks.mood.active ? mocks.mood : null, error: mocks.dbError }),
      then: (resolve: (result: unknown) => void) => resolve({ data: table === "maro_mood_saves" ? mocks.saved : [Object.fromEntries(Object.entries(mocks.mood).filter(([key]) => columns.split(",").includes(key)))], error: mocks.dbError }),
    };
    return query;
  });
});
const request = (body?: unknown) => new Request("https://maro.al/api/moods", { headers: { Authorization: "Bearer verified" }, ...(body ? { method: "POST", body: JSON.stringify(body) } : {}) });
const config: ProductionImagePrompt = { system: { id: "system", tool_id: "maro_imazh", version_label: "live", status: "live", content: "SYSTEM" }, layers: [] };
const deps = () => ({ loadModels: vi.fn(async () => [modelRow(), modelRow("sunburst")]), resolveWorkspace: vi.fn(async () => "workspace"), loadPreset: vi.fn(async () => ({ full_prompt: "PRESET", target_tool: "reklama" })), resolveReference: vi.fn(async () => ({ dataUrl: "data:image/png;base64,REF", mime: "image/png", digest: "ref-hash", normalized: false })), loadMood: vi.fn(async () => ({ title: "Halloween", prompt: privatePrompt, hash: digest(privatePrompt) })) });

describe("private maroMood access and prompt composition", () => {
  it.each([undefined, null, "", "user@example.com", "erzen@nice.al.evil", "erzen+test@nice.al"])("excludes account %s", email => expect(canUseMoods(email)).toBe(false));
  it("allows only the intended account, with case normalization", () => expect(canUseMoods("ERZEN@NICE.AL")).toBe(true));
  it.each([GET, save, adminGet, upload])("rejects other authenticated accounts before any database or upload work", async endpoint => {
    mocks.tokenUser.mockResolvedValue({ id: "other", email: "other@example.com" });
    expect((await endpoint(request({ moodId, saved: true }))).status).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled(); expect(mocks.permission).not.toHaveBeenCalled();
  });
  it("requires an authenticated session", async () => { mocks.tokenUser.mockResolvedValue(null); expect((await GET(request())).status).toBe(401); });
  it("retains the existing admin MFA/permission requirement", async () => {
    mocks.permission.mockResolvedValue({ ok: false, status: 403, error: "mfa_required" });
    expect((await adminGet(request())).status).toBe(403); expect(mocks.from).not.toHaveBeenCalled();
  });
  it("returns saved state without leaking the private mood prompt", async () => {
    mocks.saved = [{ mood_id: moodId }];
    const response = await GET(request()); const text = await response.text();
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toContain("no-store");
    expect(JSON.parse(text).items[0]).toMatchObject({ id: moodId, saved: true }); expect(text).not.toContain("PRIVATE MOOD"); expect(text).not.toContain('"prompt"');
  });
  it("checks authoritative auth identity even if a user manually submits a valid mood ID", async () => {
    mocks.account.mockResolvedValue({ data: { user: { email: "other@example.com" } }, error: null });
    await expect(resolveGenerationMood("other", moodId)).rejects.toMatchObject({ code: "moods_unavailable", status: 403 });
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("rejects an inactive mood and fails closed on a database error", async () => {
    mocks.mood.active = false; await expect(resolveGenerationMood("owner", moodId)).rejects.toMatchObject({ code: "mood_unavailable" });
    mocks.dbError = { code: "unavailable" }; await expect(resolveGenerationMood("owner", moodId)).rejects.toMatchObject({ code: "mood_configuration_unavailable" });
  });
  it.each(["", "unknown", null, {}, []])("rejects manipulated mood ID %j", moodId => expect(() => parseV1ImageRequest({ ...imazhRequest, moodId })).toThrow("invalid_mood"));
  it("rejects browser-supplied mood instructions and use on Logo", () => {
    expect(() => parseV1ImageRequest({ ...imazhRequest, moodId, moodPrompt: "INJECTED" })).toThrow();
    expect(() => parseV1ImageRequest({ ...logoRequest(), moodId })).toThrow("invalid_mood");
  });
  it("rejects a forbidden mood before model resolution or any financial work", async () => {
    const dependencies = deps(); dependencies.loadMood.mockRejectedValue(new ImageRequestValidationError("moods_unavailable", 403));
    await expect(resolveV1ImageRequest(parseV1ImageRequest({ ...imazhRequest, moodId }), "other", dependencies)).rejects.toMatchObject({ status: 403 });
    expect(dependencies.loadModels).not.toHaveBeenCalled();
  });
  it("leaves the exact existing provider prompt and provenance unchanged without a mood", async () => {
    const dependencies = deps(); const trusted = await resolveV1ImageRequest(parseV1ImageRequest(imazhRequest), "owner", dependencies);
    const compiled = buildCanonicalImagePrompt(trusted.snapshot, config, { references: [] });
    expect(compiled.prompt).toBe("SYSTEM\n\nA coffee bag on a table"); expect(compiled.provenance.promptHash).toBe(digest(compiled.prompt));
    expect(dependencies.loadMood).not.toHaveBeenCalled(); expect(trusted.snapshot).not.toHaveProperty("moodId"); expect(compiled.provenance).not.toHaveProperty("mood");
  });
  it.each(["flare", "sunburst"])("preserves presets, Brain, references, model and cost with %s", async model => {
    const trusted = await resolveV1ImageRequest(parseV1ImageRequest({ ...imazhRequest, model, moodId, maroPrompt: { id: "preset" }, useWorkspaceBrand: true, attachments: ["storage:generations/owner/ref.png"] }), "owner", deps());
    const compiled = buildCanonicalImagePrompt(trusted.snapshot, config, { presetPrompt: trusted.presetPrompt, moodPrompt: trusted.moodPrompt, brainText: "BRAIN", references: [{ id: "ref", digest: "ref-hash", source: "user" }] });
    expect(compiled.prompt).toContain("PRESET"); expect(compiled.prompt).toContain("BRAIN"); expect(compiled.prompt).toContain(imazhRequest.prompt);
    expect(compiled.prompt).toContain(privatePrompt); expect(compiled.prompt.endsWith(MOOD_PRESERVATION)).toBe(true);
    expect(compiled.operation).toBe("edit"); expect(compiled.model).toBe(`gpt-image-2.5-${model}`); expect(trusted.snapshot.model.customerCredits).toBe(7);
    expect(compiled.provenance.mood).toEqual({ id: moodId, hash: digest(privatePrompt) }); expect(JSON.stringify(trusted.snapshot)).not.toContain("PRIVATE MOOD");
    expect(compiled.prompt.indexOf(privatePrompt)).toBeGreaterThan(compiled.prompt.indexOf(imazhRequest.prompt));
  });
  it("refuses to silently omit or change a resolved mood", async () => {
    const trusted = await resolveV1ImageRequest(parseV1ImageRequest({ ...imazhRequest, moodId }), "owner", deps());
    expect(() => buildCanonicalImagePrompt(trusted.snapshot, config, { references: [] })).toThrow("mood_snapshot_missing");
    expect(() => buildCanonicalImagePrompt(trusted.snapshot, config, { references: [], moodPrompt: "changed" })).toThrow("mood_snapshot_mismatch");
  });
});
