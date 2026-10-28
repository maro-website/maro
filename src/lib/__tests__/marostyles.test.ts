import { beforeEach, describe, expect, it, vi } from "vitest";
import { canUseMood } from "@/lib/moods/model";
import { styleCoverPath, styleView, resolveGenerationMood } from "@/lib/moods/server";
import { POST, PUT, GET } from "@/app/api/moods/route";
import { PATCH } from "@/app/api/admin/moods/route";
import { POST as save } from "@/app/api/moods/save/route";
import { styleDraftSchema } from "@/lib/moods/mutations";
const owner = "11111111-1111-4111-8111-111111111111", other = "22222222-2222-4222-8222-222222222222", id = "33333333-3333-4333-8333-333333333333";
const ref = `storage:generations/_moods/${owner}/${id}.webp`;
const timestamp = "2026-10-28T10:00:00.000Z";
const mocks = vi.hoisted(() => ({ token: vi.fn(), permission: vi.fn(), account: vi.fn(), expand: vi.fn(), rate: vi.fn(), sign: vi.fn(), download: vi.fn(), rows: [] as Record<string, unknown>[], writes: [] as Record<string, unknown>[], fail: false }));
vi.mock("@/lib/admin/audit", () => ({ writeAuditEvent: vi.fn() }));
vi.mock("@/lib/admin/auth", () => ({ requirePermission: mocks.permission }));
vi.mock("@/lib/security/rateLimit", () => ({ checkRateLimit: mocks.rate }));
vi.mock("@/lib/moods/ai", () => ({ expandStyle: mocks.expand }));
vi.mock("@/lib/supabase/server", () => ({ getUserFromToken: mocks.token, getSupabaseAdmin: () => ({
  auth: { admin: { getUserById: mocks.account } }, storage: { from: () => ({ createSignedUrl: mocks.sign, download: mocks.download }) },
  from: (table: string) => {
    let filters: ((r: Record<string, unknown>) => boolean)[] = [], fields = "", write: Record<string, unknown> | null = null, insert = false;
    const result = () => {
      if (mocks.fail) return { data: null, error: { code: "unavailable" } };
      if (table === "maro_mood_saves") return { data: [], error: null };
      let rows = mocks.rows.filter(row => filters.every(test => test(row)));
      if (write) {
        mocks.writes.push(write);
        if (insert) { const row = { id, sort_order: 0, ...write }; mocks.rows.push(row); rows = [row]; }
        else for (const row of rows) Object.assign(row, write);
      }
      return { data: rows.map(row => Object.fromEntries(Object.entries(row).filter(([key]) => fields.split(",").includes(key)))), error: null };
    };
    const q = {
      select: (value: string) => { fields = value; return q; },
      eq: (key: string, value: unknown) => { filters.push(row => row[key] === value); return q; },
      in: (key: string, values: unknown[]) => { filters.push(row => values.includes(row[key])); return q; },
      or: (value: string) => { const user = value.split("created_by.eq.")[1]; filters.push(row => row.visibility === "public" || row.created_by === user); return q; },
      order: () => q, range: () => q, limit: () => q,
      update: (value: Record<string, unknown>) => { write = value; return q; },
      insert: (value: Record<string, unknown>) => { write = value; insert = true; return q; },
      maybeSingle: async () => { const r = result(); return { ...r, data: r.data?.[0] ?? null }; },
      single: async () => { const r = result(); return { ...r, data: r.data?.[0] ?? null }; },
      then: (resolve: (v: unknown) => void) => resolve(result()),
    }; return q;
  },
}) }));
const brief = { title: "Golden Hour", input_text: "  Dritë e ngrohtë\nMe hije të buta  ", cover_ref: ref, visibility: "public", request_id: "44444444-4444-4444-8444-444444444444" };
const row = (patch: Record<string, unknown> = {}) => ({ id, title: "Golden Hour", prompt: "PRIVATE EXPANDED INSTRUCTIONS", description: "Atmosferë verore", sort_order: 0, active: true, status: "approved", visibility: "public", source: "community", created_by: owner, publisher_name: "Erzen", updated_at: timestamp, input_text: brief.input_text, cover_url: ref, ...patch });
const request = (body?: unknown, url = "https://maro.al/api/moods") => new Request(url, { headers: { Authorization: "Bearer verified", "Content-Type": "application/json" }, ...(body ? { method: "POST", body: JSON.stringify(body) } : {}) });
beforeEach(() => {
  vi.clearAllMocks(); mocks.rows = []; mocks.writes = []; mocks.fail = false;
  mocks.token.mockResolvedValue({ id: owner, email: "erzen@nice.al", user_metadata: {} });
  mocks.account.mockResolvedValue({ data: { user: { email: "erzen@nice.al" } }, error: null });
  mocks.permission.mockResolvedValue({ ok: true, requestId: "test" });
  mocks.rate.mockResolvedValue({ allowed: true });
  mocks.sign.mockResolvedValue({ data: { signedUrl: "https://example.test/short-lived-cover" }, error: null });
  mocks.download.mockResolvedValue({ data: new Blob(["synthetic"]), error: null });
  mocks.expand.mockResolvedValue({ prompt: "PRIVATE EXPANDED INSTRUCTIONS", ai_model: "test", input_tokens: 20, output_tokens: 30 });
});
describe("style privacy and state boundaries", () => {
  it.each(["pending", "processing", "failed", "rejected"])("prevents use of %s styles even by the owner", status => expect(canUseMood(row({ status }) as Parameters<typeof canUseMood>[0], owner)).toBe(false));
  it("permits approved private styles only to the owner and never permits inactive styles", () => {
    expect(canUseMood(row({ visibility: "private" }) as Parameters<typeof canUseMood>[0], owner)).toBe(true);
    expect(canUseMood(row({ visibility: "private" }) as Parameters<typeof canUseMood>[0], other)).toBe(false);
    expect(canUseMood(row({ active: false }) as Parameters<typeof canUseMood>[0], owner)).toBe(false);
  });
  it("never serializes compiled prompts, including in admin views", async () => {
    for (const admin of [false, true]) {
      const view = await styleView(row(), owner, admin);
      expect(view.input_text).toBe(brief.input_text); expect(JSON.stringify(view)).not.toContain("PRIVATE EXPANDED"); expect(view).not.toHaveProperty("prompt");
    }
    const stranger = await styleView(row(), other);
    expect(stranger).not.toHaveProperty("input_text"); expect(stranger).not.toHaveProperty("cover_ref");
  });
  it("excludes other owners' private, pending and rejected rows from discovery", async () => {
    mocks.rows = [row(), row({ id: "private", created_by: other, visibility: "private" }), row({ id: "pending", active: false, status: "pending" }), row({ id: "rejected", active: false, status: "rejected" })];
    const response = await GET(request()); expect(response.status).toBe(200);
    expect((await response.json()).items.map((item: { id: string }) => item.id)).toEqual([id]);
  });
  it("rejects a guessed private ID in generation and saving before financial work", async () => {
    mocks.rows = [row({ created_by: other, visibility: "private" })];
    await expect(resolveGenerationMood(owner, id)).rejects.toMatchObject({ code: "mood_unavailable" });
    expect((await save(request({ moodId: id, saved: true }))).status).toBe(404);
  });
  it.each([`storage:generations/_moods/${other}/${id}.webp`, `storage:generations/_moods/${owner}/../${id}.webp`, "https://external.test/a.png"])("rejects foreign or malformed cover %s", value => expect(styleCoverPath(value, owner)).toBeNull());
});
describe("creation and review", () => {
  it("keeps the exact original input and stores generated instructions only on the server", async () => {
    const response = await POST(request(brief)); const text = await response.text();
    expect(response.status).toBe(200); expect(text).not.toContain("PRIVATE EXPANDED");
    expect(mocks.rows[0]).toMatchObject({ input_text: brief.input_text, prompt: "PRIVATE EXPANDED INSTRUCTIONS", status: "pending", active: false, created_by: owner, source: "community" });
    expect(mocks.expand).toHaveBeenCalledWith(brief.title, brief.input_text);
  });
  it("does not repeat OpenAI work after a lost response with the same request ID", async () => {
    await POST(request(brief)); await POST(request(brief)); expect(mocks.expand).toHaveBeenCalledTimes(1); expect(mocks.rows).toHaveLength(1);
  });
  it("invalidates prior approval on edits before preparing the replacement", async () => {
    mocks.rows = [row()];
    const response = await PUT(request({ ...brief, id, updated_at: timestamp })); expect(response.status).toBe(200);
    expect(mocks.writes[0]).toMatchObject({ status: "processing", active: false, reviewed_by: null });
    expect(mocks.rows[0]).toMatchObject({ status: "pending", active: false });
  });
  it("cannot edit someone else's style", async () => {
    mocks.rows = [row({ created_by: other })]; expect((await PUT(request({ ...brief, id, updated_at: timestamp }))).status).toBe(404); expect(mocks.expand).not.toHaveBeenCalled();
  });
  it("fails closed when OpenAI fails and leaves a recoverable failed item", async () => {
    mocks.expand.mockRejectedValue(new Error("provider secret"));
    const response = await POST(request(brief)); expect(response.status).toBe(503); expect(await response.text()).not.toContain("provider secret");
    expect(mocks.rows[0]).toMatchObject({ status: "failed", active: false });
  });
  it("enforces a daily bound before paid preparation", async () => {
    mocks.rate.mockResolvedValue({ allowed: false }); expect((await POST(request(brief))).status).toBe(429); expect(mocks.expand).not.toHaveBeenCalled(); expect(mocks.rows).toHaveLength(0);
  });
  it("rejects client-supplied instructions, approval, source, identity and long titles", () => {
    for (const extra of [{ prompt: "INJECT" }, { active: true }, { status: "approved" }, { source: "platform" }, { created_by: other }, { title: "x".repeat(41) }]) expect(styleDraftSchema.safeParse({ ...brief, ...extra }).success).toBe(false);
  });
  it("requires a reason for rejection and refuses stale reviews", async () => {
    mocks.rows = [row({ status: "pending", active: false })];
    expect((await PATCH(request({ id, updated_at: timestamp, decision: "rejected" }))).status).toBe(400);
    expect((await PATCH(request({ id, updated_at: "2026-10-27T00:00:00.000Z", decision: "approved" }))).status).toBe(409);
    expect(mocks.rows[0].active).toBe(false);
  });
  it("records approval, and can withdraw it with a creator-visible reason", async () => {
    mocks.rows = [row({ status: "pending", active: false })];
    expect((await PATCH(request({ id, updated_at: timestamp, decision: "approved" }))).status).toBe(200);
    expect(mocks.rows[0]).toMatchObject({ status: "approved", active: true, reviewed_by: owner });
    expect((await PATCH(request({ id, updated_at: mocks.rows[0].updated_at, decision: "rejected", reason: "Ndrysho thumbnail-in." }))).status).toBe(200);
    expect(mocks.rows[0]).toMatchObject({ status: "rejected", active: false, rejection_reason: "Ndrysho thumbnail-in." });
  });
});
