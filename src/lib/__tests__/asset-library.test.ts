import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), list: vi.fn(), info: vi.fn(), remove: vi.fn(), sign: vi.fn(), from: vi.fn(), admin: vi.fn() }));
vi.mock("@/lib/payments/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({ supabaseServerConfigured: () => true, getSupabaseAdmin: mocks.admin }));
vi.mock("@/lib/storage/assets", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/storage/assets")>(), signStoragePath: mocks.sign }));
vi.mock("@/lib/supabase/client", () => ({ getAccessToken: vi.fn() }));
import { GET, POST, DELETE } from "@/app/api/assets/route";
import { libraryStorageRef, ownedLibraryReference } from "@/lib/services/assetLibrary";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: "owner" });
  mocks.admin.mockReturnValue({ storage: { from: mocks.from } });
  mocks.from.mockReturnValue({ list: mocks.list, info: mocks.info, remove: mocks.remove });
  mocks.info.mockResolvedValue({ data: { size: 2048 }, error: null });
  mocks.remove.mockResolvedValue({ data: [], error: null });
  mocks.list.mockResolvedValue({ data: [{ id: "file-1", name: "upload.png", created_at: "2026-10-02", metadata: { size: 123 } }], error: null });
  mocks.sign.mockResolvedValue("https://signed/private-preview");
});

const request = (method: string, body: unknown) => new Request("https://maro.test/api/assets", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
describe("asset metadata and upload deletion", () => {
  it.each([POST, DELETE])("does not use storage without authentication", async handler => {
    mocks.requireUser.mockResolvedValue(null);
    expect((await handler(request(handler === POST ? "POST" : "DELETE", {}))).status).toBe(401);
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("reads the actual size of an owned file without downloading it", async () => {
    const ref = "storage:generations/owner/result.png";
    const response = await POST(request("POST", { refs: [ref], userId: "foreign", bytes: 1 }));
    expect(await response.json()).toEqual({ assets: [{ storageRef: ref, bytes: 2048 }] });
    expect(mocks.info).toHaveBeenCalledExactlyOnceWith("owner/result.png");
  });
  it.each(["storage:generations/foreign/image.png", "storage:generations/owner/../image.png", "storage:maro-public/owner/image.png", "https://remote/image.png"])("rejects metadata for %s", async ref => {
    expect((await POST(request("POST", { refs: [ref] }))).status).toBe(403);
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("removes only the authenticated owner's chosen upload", async () => {
    expect((await DELETE(request("DELETE", { storageRef: "storage:generations/owner/project-assets/a.png", userId: "foreign" }))).status).toBe(200);
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith(["owner/project-assets/a.png"]);
  });
  it.each(["storage:generations/foreign/project-assets/a.png", "storage:generations/owner/project-assets/../a.png", "storage:generations/owner/brain/a.png"])("never deletes unauthorized or unrelated file %s", async ref => {
    expect((await DELETE(request("DELETE", { storageRef: ref }))).status).toBe(403);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("reports storage deletion failure", async () => {
    mocks.remove.mockResolvedValue({ error: { message: "unavailable" } });
    expect((await DELETE(request("DELETE", { storageRef: "storage:generations/owner/project-assets/a.png" }))).status).toBe(503);
  });
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
