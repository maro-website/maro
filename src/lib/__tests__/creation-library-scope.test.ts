import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ token: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ getAccessToken: mocks.token }));
import { fetchMyCreations } from "@/lib/services/creationsService";

const fetchMock = vi.fn();
beforeEach(() => { vi.clearAllMocks(); mocks.token.mockResolvedValue("owner-token"); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => vi.unstubAllGlobals());
const page = (id: string, nextOffset: number | null) => Response.json({ items: [{ id }], nextOffset });
describe("account-wide library pagination", () => {
  it("loads every page across workspaces with the same authenticated scope", async () => {
    fetchMock.mockResolvedValueOnce(page("first", 200)).mockResolvedValueOnce(page("second", null));
    expect((await fetchMyCreations(undefined, { workspace: "all" }))?.map(item => item.id)).toEqual(["first", "second"]);
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/creations?workspace=all", expect.objectContaining({ headers: { Authorization: "Bearer owner-token" } }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/creations?workspace=all&offset=200", expect.anything());
  });
  it("preserves the default active-workspace request for existing callers", async () => {
    fetchMock.mockResolvedValueOnce(page("active", 200));
    await fetchMyCreations();
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/creations", expect.anything());
  });
  it("does not return a partial successful library if a later page fails", async () => {
    fetchMock.mockResolvedValueOnce(page("first", 200)).mockResolvedValueOnce(new Response(null, { status: 503 }));
    expect(await fetchMyCreations(undefined, { workspace: "all" })).toBeNull();
  });
  it("does not access another account through an unsigned request", async () => {
    mocks.token.mockResolvedValue(null);
    expect(await fetchMyCreations(undefined, { workspace: "all" })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
