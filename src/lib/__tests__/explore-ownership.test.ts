import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { copyToPublicExploreAsset, publishStoredUrlToExplore } from "@/lib/storage/assets";
import { POST } from "@/app/api/explore/route";

const mocks = vi.hoisted(() => ({
  download: vi.fn(), upload: vi.fn(), insert: vi.fn(), getUser: vi.fn(),
  getAdmin: vi.fn(), sign: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: mocks.getAdmin,
  getUserFromToken: mocks.getUser,
  supabaseServerConfigured: () => true,
  publishStoredUrlToExplore: async (input: Parameters<typeof publishStoredUrlToExplore>[0]) =>
    (await import("@/lib/storage/assets")).publishStoredUrlToExplore(input),
  resolveAssetForClient: vi.fn(),
}));

const origin = "https://maro-test.supabase.co";
const owner = "user-a";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", origin);
  mocks.getUser.mockResolvedValue({ id: owner, user_metadata: {} });
  mocks.download.mockResolvedValue({ data: new Blob(["owned image"]), error: null });
  mocks.upload.mockResolvedValue({ error: null });
  mocks.sign.mockResolvedValue({ data: { signedUrl: `${origin}/public-copy` }, error: null });
  mocks.insert.mockReturnValue({ select: () => ({ single: async () => ({ data: { slug: "published" }, error: null }) }) });
  mocks.getAdmin.mockReturnValue({
    storage: { from: (bucket: string) => ({
      download: mocks.download, upload: mocks.upload, createSignedUrl: mocks.sign,
      getPublicUrl: (path: string) => ({ data: { publicUrl: `${origin}/storage/v1/object/public/${bucket}/${path}` } }),
    }) },
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: { full_name: "Owner" } }) }) }),
      insert: mocks.insert,
    }),
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("Explore publication ownership", () => {
  it.each([
    "storage:generations/user-b/private.png",
    `${origin}/storage/v1/object/sign/generations/user-b/private.png?token=expired`,
    `${origin}/storage/v1/object/public/generations/user-b/private.png`,
    "storage:other-bucket/user-a/private.png",
    "storage:other-bucket/public/explore/private.png",
    "storage:maro-public/user-b/private.png",
    "storage:generations/user-a/../user-b/private.png",
    "storage:generations/user-a/%2e%2e/user-b/private.png",
    "storage:generations/user-a/%252e%252e/user-b/private.png",
    "storage:generations/user-a/..\\user-b/private.png",
    "storage:generations/user-a//private.png",
    `${origin}/storage/v1/object/sign/generations/user-a/%252e%252e/user-b/private.png`,
    "https://attacker.test/storage/v1/object/public/generations/user-a/private.png",
    "https://maro-test.supabase.co.attacker.test/storage/v1/object/public/generations/user-a/private.png",
    "https://attacker.test/image.png",
  ])("denies %s before any privileged storage access", async (storedUrl) => {
    expect(await publishStoredUrlToExplore({ storedUrl, userId: owner, slug: "share" })).toBeNull();
    expect(mocks.getAdmin).not.toHaveBeenCalled();
    expect(mocks.download).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("cannot bypass ownership by calling the copy helper directly", async () => {
    expect(await copyToPublicExploreAsset({ sourcePath: "user-b/private.png", userId: owner, slug: "share" })).toBeNull();
    expect(await copyToPublicExploreAsset({ sourcePath: "user-a/private.png", userId: "", slug: "share" })).toBeNull();
    expect(mocks.getAdmin).not.toHaveBeenCalled();
  });

  it.each([
    "storage:generations/user-a/generated.png",
    `${origin}/storage/v1/object/sign/generations/user-a/generated.png?token=expired`,
    `${origin}/storage/v1/object/public/generations/user-a/generated.png`,
  ])("preserves publication of an owned asset: %s", async (storedUrl) => {
    expect(await publishStoredUrlToExplore({ storedUrl, userId: owner, slug: "share" }))
      .toBe(`${origin}/storage/v1/object/public/maro-public/public/explore/share/asset.png`);
    expect(mocks.download).toHaveBeenCalledExactlyOnceWith("user-a/generated.png");
    expect(mocks.upload).toHaveBeenCalledOnce();
  });

  it("preserves sharing of intentionally public Explore copies without a private read", async () => {
    const url = `${origin}/storage/v1/object/public/maro-public/public/explore/old/asset.png`;
    expect(await publishStoredUrlToExplore({ storedUrl: url, userId: owner, slug: "share" })).toBe(url);
    expect(mocks.download).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("fails closed when an owned object cannot be read", async () => {
    mocks.download.mockResolvedValue({ data: null, error: { message: "missing" } });
    expect(await publishStoredUrlToExplore({ storedUrl: "storage:generations/user-a/missing.png", userId: owner, slug: "share" })).toBeNull();
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("the endpoint uses the authenticated identity, ignoring a spoofed body userId", async () => {
    const response = await POST(new Request("https://maro.test/api/explore", {
      method: "POST", headers: { Authorization: "Bearer user-a-token", "Content-Type": "application/json" },
      body: JSON.stringify({ toolId: "reklama", url: "storage:generations/user-b/private.png", userId: "user-b" }),
    }));
    expect(response.status).toBe(400);
    expect(mocks.download).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("the endpoint still publishes an owned generated image", async () => {
    const response = await POST(new Request("https://maro.test/api/explore", {
      method: "POST", headers: { Authorization: "Bearer user-a-token", "Content-Type": "application/json" },
      body: JSON.stringify({ toolId: "reklama", url: "storage:generations/user-a/generated.png", prompt: "My image" }),
    }));
    expect(response.status).toBe(200);
    expect(mocks.download).toHaveBeenCalledExactlyOnceWith("user-a/generated.png");
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: owner }));
  });
});
