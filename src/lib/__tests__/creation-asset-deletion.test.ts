import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), admin: vi.fn(), from: vi.fn(), lookup: vi.fn(), update: vi.fn(), remove: vi.fn(), read: vi.fn(), write: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ supabaseServerConfigured: () => true, getUserFromToken: mocks.auth, getSupabaseAdmin: mocks.admin, getActiveWorkspaceId: vi.fn(), resolveAssetListForClient: vi.fn() }));
import { DELETE } from "@/app/api/creations/route";
const refs = ["storage:generations/owner/a.png", "storage:generations/owner/b.png", "storage:generations/owner/c.png"];
const query = { eq: vi.fn().mockReturnThis(), contains: vi.fn().mockReturnThis(), maybeSingle: mocks.read };
const update = { eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), maybeSingle: mocks.write };
const request = (assetRefs: string[]) => new Request("https://maro.test/api/creations", { method: "DELETE", headers: { Authorization: "Bearer token", "Content-Type": "application/json" }, body: JSON.stringify({ id: "generation", assetRefs, userId: "foreign" }) });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ id: "owner" });
  mocks.admin.mockReturnValue({ from: mocks.from, storage: { from: () => ({ remove: mocks.remove }) } });
  mocks.from.mockReturnValue({ select: mocks.lookup, update: mocks.update });
  mocks.lookup.mockReturnValue(query); mocks.update.mockReturnValue(update);
  mocks.read.mockResolvedValue({ data: { id: "generation", output_urls: refs }, error: null });
  mocks.write.mockResolvedValue({ data: { id: "generation" }, error: null });
  mocks.remove.mockResolvedValue({ data: [], error: null });
});
describe("selected creation asset deletion", () => {
  it("updates only the owner's selected outputs and removes only those files", async () => {
    expect((await DELETE(request([refs[1]]))).status).toBe(200);
    expect(query.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(update.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith({ output_urls: [refs[0], refs[2]] });
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith(["owner/b.png"]);
  });
  it("does not delete the generation row when the last outputs are removed", async () => {
    expect((await DELETE(request(refs))).status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({ output_urls: [] });
  });
  it("rejects unauthenticated requests before database/storage access", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await DELETE(request([refs[0]]))).status).toBe(401);
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("does not remove files for a generation outside the authenticated owner's query", async () => {
    mocks.read.mockResolvedValue({ data: null, error: null });
    expect((await DELETE(request([refs[0]]))).status).toBe(404);
    expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("rejects an output that is not part of the chosen generation", async () => {
    expect((await DELETE(request(["storage:generations/owner/another.png"]))).status).toBe(409);
    expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("does not delete storage when the generation changed concurrently", async () => {
    mocks.write.mockResolvedValue({ data: null, error: null });
    expect((await DELETE(request([refs[0]]))).status).toBe(409);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("restores the library output list when storage removal fails", async () => {
    mocks.remove.mockResolvedValue({ error: { message: "unavailable" } });
    expect((await DELETE(request([refs[0]]))).status).toBe(503);
    expect(mocks.update).toHaveBeenLastCalledWith({ output_urls: refs });
  });
});
