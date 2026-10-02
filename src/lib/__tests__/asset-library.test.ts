import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), list: vi.fn(), sign: vi.fn(), from: vi.fn(), admin: vi.fn() }));
vi.mock("@/lib/payments/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({ supabaseServerConfigured: () => true, getSupabaseAdmin: mocks.admin }));
vi.mock("@/lib/storage/assets", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/storage/assets")>(), signStoragePath: mocks.sign }));
vi.mock("@/lib/supabase/client", () => ({ getAccessToken: vi.fn() }));
import { GET } from "@/app/api/assets/route";
import { libraryStorageRef, ownedLibraryReference } from "@/lib/services/assetLibrary";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: "owner" });
  mocks.admin.mockReturnValue({ storage: { from: mocks.from } });
  mocks.from.mockReturnValue({ list: mocks.list });
  mocks.list.mockResolvedValue({ data: [{ id: "file-1", name: "upload.png", created_at: "2026-10-02", metadata: { size: 123 } }], error: null });
  mocks.sign.mockResolvedValue("https://signed/private-preview");
});
afterEach(() => vi.unstubAllEnvs());
describe("private asset library", () => {
  it("lists and signs only the verified owner's uploads, ignoring a supplied owner/path", async () => {
    const response = await GET(new Request("https://maro.test/api/assets?userId=foreign&path=foreign/project-assets&offset=50"));
    expect(response.status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith("owner/project-assets", { limit: 50, offset: 50, sortBy: { column: "created_at", order: "desc" } });
    expect(mocks.sign).toHaveBeenCalledExactlyOnceWith("owner/project-assets/upload.png");
    expect(await response.json()).toEqual({ assets: [{ storageRef: "storage:generations/owner/project-assets/upload.png", url: "https://signed/private-preview", name: "upload.png", createdAt: "2026-10-02", bytes: 123 }], nextOffset: null });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("does not access storage for unsigned requests", async () => {
    mocks.requireUser.mockResolvedValue(null);
    expect((await GET(new Request("https://maro.test/api/assets"))).status).toBe(401);
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it.each(["-1", "1.5", "Infinity", "100001", "abc"])("rejects invalid pagination %s", async offset => {
    expect((await GET(new Request(`https://maro.test/api/assets?offset=${offset}`))).status).toBe(400);
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it("excludes folders, non-image files, and unsafe object paths", async () => {
    mocks.list.mockResolvedValue({ data: [{ id: null, name: "folder" }, { id: "1", name: "../private.png" }, { id: "2", name: "file.pdf" }], error: null });
    expect(await (await GET(new Request("https://maro.test/api/assets"))).json()).toEqual({ assets: [], nextOffset: null });
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it("returns a retryable error instead of an empty successful list after storage failure", async () => {
    mocks.list.mockResolvedValue({ data: null, error: { message: "unavailable" } });
    expect((await GET(new Request("https://maro.test/api/assets"))).status).toBe(503);
  });
  it("does not authorize foreign refs, traversal, or remote URLs", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    expect(ownedLibraryReference("storage:generations/owner/result.png", "owner")).toBe(true);
    for (const ref of ["storage:generations/foreign/result.png", "storage:generations/owner/../foreign.png", "storage:generations/owner/%2e%2e/image.png", "storage:generations/owner/a?other"]) expect(ownedLibraryReference(ref, "owner")).toBe(false);
    expect(libraryStorageRef("https://project.supabase.co/storage/v1/object/sign/generations/owner/result.png?token=display-only", "owner")).toBe("storage:generations/owner/result.png");
    expect(libraryStorageRef("https://foreign.example/storage/v1/object/sign/generations/owner/result.png", "owner")).toBeNull();
  });
});
