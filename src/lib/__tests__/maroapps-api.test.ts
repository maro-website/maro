import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ user: vi.fn(), db: vi.fn(), rate: vi.fn(async () => ({ allowed: true })) }));
vi.mock("@/lib/supabase/server", () => ({ supabaseServerConfigured: () => true, getUserFromToken: m.user, getSupabaseAdmin: m.db, getWorkspaceBrainProfile: vi.fn(), resolveAssetListForClient: vi.fn(async () => []) }));
vi.mock("@/lib/ai/openai", () => ({ hasOpenAiKey: () => true, editImages: vi.fn() }));
vi.mock("@/lib/ai/imageReferences", () => ({ resolvePrivateImageReference: vi.fn(async () => ({ dataUrl: "data:image/png;base64,synthetic", digest: "synthetic" })) }));
vi.mock("@/lib/engine/v1ImageModels", () => ({ loadV1ImageModelRows: vi.fn(async () => []), resolveV1ImageModel: vi.fn(() => ({ providerModelId: "gpt-image-2.5-flare" })) }));
vi.mock("@/lib/security/circuitBreaker", () => ({ assertCircuitAllows: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/lib/operations/budgetGuards", () => ({ assertBudgetGuards: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/lib/workspaces/accountPolicyServer", () => ({ AccountPolicyError: class extends Error {}, requireBrainAccess: vi.fn(), requireStorageSpace: vi.fn() }));
vi.mock("@/lib/security/rateLimit", () => ({ checkRateLimit: m.rate }));
vi.mock("@/lib/admin/auth", () => ({ requirePermission: vi.fn(async () => ({ ok: false, status: 403, error: "forbidden" })) }));
import { GET, POST } from "@/app/api/apps/route";
import { POST as action } from "@/app/api/apps/action/route";
import { GET as download } from "@/app/api/apps/download/route";
import { PUT as configure } from "@/app/api/admin/engine/apps/route";
import { ownedFeed, handleFeedGet } from "@/lib/feed/server";
import { appReferences } from "@/lib/apps/model";
import { initialAppDraft, appDraftPayload } from "@/components/apps/AppsPreparation";
const req = (path: string, body?: unknown) => new Request(`https://maro.al${path}`, { method: body === undefined ? "GET" : "POST", headers: { Authorization: "Bearer synthetic", "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
beforeEach(() => { vi.clearAllMocks(); m.user.mockResolvedValue(null); m.db.mockImplementation(() => { throw new Error("unexpected_database_access"); }); });
describe("maroApps private access and studio isolation", () => {
  it.each([null, { id: "u", email: "other@nice.al", email_confirmed_at: "2026-10-20" }, { id: "u", email: "erzen@nice.al", email_confirmed_at: null }])("rejects guests, other accounts and unverified owner before financial/provider access", async user => {
    m.user.mockResolvedValue(user);
    const results = await Promise.all([GET(req("/api/apps")), POST(req("/api/apps", {})), action(req("/api/apps/action", {})), download(req("/api/apps/download"))]);
    expect(results.map(r => r.status)).toEqual(Array(4).fill(user ? 404 : 401)); expect(m.db).not.toHaveBeenCalled();
    results.forEach(r => expect(r.headers.get("cache-control")).toBe("no-store"));
  });
  it("rejects incomplete app requests and forged prices before any database work", async () => {
    m.user.mockResolvedValue({ id: "u", email: "erzen@nice.al", email_confirmed_at: "2026-10-20" });
    expect((await POST(req("/api/apps", { requestId: crypto.randomUUID(), workspaceId: "ws", references: ["storage:generations/u/screen.png"], category: "tech", useBrain: false, brief: {}, price: 0 }))).status).toBe(400);
    expect(m.db).not.toHaveBeenCalled();
    expect((await configure(req("/api/admin/engine/apps", {}))).status).toBe(403);
  });
  it("prevents accessing campaigns through the other studio endpoint", async () => {
    let row = { brief: { brand: "x", mobile: {} } };
    const builder = { select: () => builder, eq: () => builder, maybeSingle: async () => ({ data: row, error: null }) };
    m.db.mockReturnValue({ from: () => builder });
    await expect(ownedFeed("u", "id", "feed")).rejects.toThrow("feed_not_found");
    await expect(ownedFeed("u", "id", "apps")).resolves.toBe(row);
    row = { brief: { brand: "x" } } as typeof row;
    await expect(ownedFeed("u", "id", "apps")).rejects.toThrow("feed_not_found");
  });
  it("persists the full app brief with independent settings and filters Feed and Apps histories", async () => {
    m.user.mockResolvedValue({ id: "u", email: "erzen@nice.al", email_confirmed_at: "2026-10-20" });
    const ref = "storage:generations/u/screen.png", id = crypto.randomUUID();
    const draft = { ...initialAppDraft, brief: { ...initialAppDraft.brief, brand:"Planly", description:"Calendar and task planning", audience:"Freelancers" }, mobile: { ...initialAppDraft.mobile, benefit:"See your day at a glance", features:"Calendar and tasks" } };
    const payload = appDraftPayload(draft);
    payload.mobile.screenshots = [{ reference: ref, platform:"ios", feature:"Calendar" }];
    payload.references = appReferences(payload.mobile);
    const row = { id, brief:{ ...payload.brief,mobile:payload.mobile }, category:"tech", created_at:"2026-10-20", references_list:[ref], free_used:0, refunded:false, cancelled_at:null, refund_credits:0 };
    const filters: unknown[][] = [], tables: string[] = [];
    const rpc = vi.fn(async (name: string) => ({ data:name === "maro_feed_create_v2" ? id : null,error:null }));
    const db = { rpc, from:(table: string) => {
      tables.push(table);let fields = "";
      const result = () => ({ data:table === "maro_feed_attempts" ? [] : table === "maro_feeds" ? [row] : null,error:null });
      const q = { select:(value: string) => { fields=value;return q; }, eq:() => q, filter:(...args: unknown[]) => { filters.push(args);return q; }, order:() => q, limit:() => q,
        maybeSingle:async () => ({ data:table === "workspaces" ? {id:"ws"} : table === "maro_feeds" ? row : null,error:null }),
        single:async () => ({ data:fields ? row : null,error:null }),
        then:(resolve: (value: unknown) => void) => Promise.resolve(result()).then(resolve),
      };return q;
    } };
    m.db.mockReturnValue(db);
    const response = await POST(req("/api/apps", { ...payload,requestId:crypto.randomUUID(),workspaceId:"ws" }));
    expect(response.status).toBe(200);
    expect((await response.json()).feed.mobile).toEqual(payload.mobile);
    expect(rpc).toHaveBeenCalledWith("maro_feed_create_v2",expect.objectContaining({p_brief:expect.objectContaining({mobile:payload.mobile}),p_config:expect.objectContaining({model:"flare"})}));
    expect(tables).toContain("maro_apps_config");expect(tables).not.toContain("maro_feed_config");
    await GET(req("/api/apps?workspaceId=ws"));await handleFeedGet(req("/api/feed?workspaceId=ws"));
    expect(filters).toContainEqual(["brief->mobile","not.is","null"]);expect(filters).toContainEqual(["brief->mobile","is","null"]);
  });
});
