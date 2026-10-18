import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), configured: vi.fn(), from: vi.fn(), policy: vi.fn(), rate: vi.fn(), fetch: vi.fn(), logo: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getUserFromToken: mocks.user, supabaseServerConfigured: mocks.configured, getSupabaseAdmin: () => ({ from: mocks.from }) }));
vi.mock("@/lib/workspaces/accountPolicyServer", async () => { const actual = await vi.importActual<typeof import("@/lib/workspaces/accountPolicyServer")>("@/lib/workspaces/accountPolicyServer"); return { ...actual, requireBrainAccess: mocks.policy }; });
vi.mock("@/lib/security/rateLimit", () => ({ checkRateLimit: mocks.rate }));
vi.mock("@/lib/brain-fetch/service", () => ({ fetchBrand: mocks.fetch, fetchBrandLogo: mocks.logo }));
import { POST } from "@/app/api/brain/fetch-brand/route";
import { POST as LOGO } from "@/app/api/brain/fetch-brand/logo/route";
const MEMBER_ID = "11111111-aaaa-4111-8111-111111111111";
import { AccountPolicyError } from "@/lib/workspaces/accountPolicyServer";
const workspaceId = "11111111-1111-4111-8111-111111111111";
const request = (body: unknown = { workspaceId, url: "example.test" }) => new Request("https://maro.al/api/brain/fetch-brand", { method: "POST", headers: { Authorization: "Bearer test-session", "Content-Type": "application/json" }, body: JSON.stringify(body) });
let query: { select: ReturnType<typeof vi.fn>; eq: ReturnType<typeof vi.fn>; maybeSingle: ReturnType<typeof vi.fn> };
beforeEach(() => {
  vi.resetAllMocks(); mocks.configured.mockReturnValue(true);
  mocks.user.mockResolvedValue({ id: MEMBER_ID, email: "member@example.test" });
  query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { id: workspaceId }, error: null }) };
  mocks.from.mockReturnValue(query); mocks.policy.mockResolvedValue({ brainAccess: true }); mocks.rate.mockResolvedValue({ allowed: true, retryAfter: 0 });
  mocks.fetch.mockResolvedValue({ fields: {}, aiUsed: false }); mocks.logo.mockResolvedValue("data:image/png;base64,test");
});
describe("Fetch Brand API", () => {
  it.each([POST, LOGO])("blocks anonymous and unavailable setup before workspace queries or outbound requests", async handler => {
    mocks.user.mockResolvedValueOnce(null);
    const anonymous = await handler(request()); expect(anonymous.status).toBe(401);
    mocks.configured.mockReturnValue(false);
    expect((await handler(request())).status).toBe(503);
    expect(mocks.from).not.toHaveBeenCalled(); expect(mocks.fetch).not.toHaveBeenCalled(); expect(mocks.logo).not.toHaveBeenCalled();
    expect(anonymous.headers.get("Cache-Control")).toBe("no-store");
  });
  it("checks workspace ownership and an active Brain plan before fetching", async () => {
    expect((await POST(request())).status).toBe(200);
    expect(query.eq.mock.calls).toEqual([["id", workspaceId], ["owner_id", MEMBER_ID]]);
    expect(mocks.policy).toHaveBeenCalledWith(MEMBER_ID, workspaceId);
    expect(mocks.fetch).toHaveBeenCalledWith("https://example.test/", `${MEMBER_ID}:${workspaceId}`);
    mocks.fetch.mockClear(); query.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    expect((await POST(request())).status).toBe(404); expect(mocks.fetch).not.toHaveBeenCalled();
    mocks.policy.mockRejectedValueOnce(new AccountPolicyError("brain_plan_required", 403));
    expect((await POST(request())).status).toBe(403); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("accepts existing text workspace IDs from the production workspace bootstrap", async () => {
    const textId = "ws_owner_1729000000_example";
    query.maybeSingle.mockResolvedValueOnce({ data: { id: textId }, error: null });
    expect((await POST(request({ workspaceId: textId, url: "example.test" }))).status).toBe(200);
    expect(query.eq).toHaveBeenCalledWith("id", textId);
    expect(mocks.policy).toHaveBeenCalledWith(MEMBER_ID, textId);
    expect(mocks.fetch).toHaveBeenCalledWith("https://example.test/", `${MEMBER_ID}:${textId}`);
  });
  it("rejects private or invalid URLs, oversized bodies and caller-supplied identity", async () => {
    for (const url of ["http://127.0.0.1/", "https://localhost/", "file:///etc/passwd", "https://example.test:8080", "https://u:p@example.test/"]) expect((await POST(request({ workspaceId, url }))).status).toBe(422);
    expect((await POST(request({ workspaceId, url: "example.test", userId: MEMBER_ID }))).status).toBe(400);
    expect((await POST(request({ workspaceId, url: "x".repeat(5000) }))).status).toBe(413);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("fails closed on database errors and account-wide rate limits, including the logo route", async () => {
    query.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "private data" } });
    const failed = await POST(request()); expect(failed.status).toBe(503); expect(await failed.text()).not.toContain("private data");
    mocks.rate.mockResolvedValue({ allowed: false, retryAfter: 60 });
    const limited = await LOGO(request()); expect(limited.status).toBe(429); expect(limited.headers.get("Retry-After")).toBe("60");
    expect(mocks.logo).not.toHaveBeenCalled();
    expect(mocks.rate).toHaveBeenCalledWith("brain-fetch:logo:3600", MEMBER_ID, 40, 3600, "strict");
  });
  it("returns only sanitized logo data with private response headers", async () => {
    const res = await LOGO(request()); expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ dataUrl: "data:image/png;base64,test" });
    expect(res.headers.get("Vary")).toBe("Authorization"); expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});
