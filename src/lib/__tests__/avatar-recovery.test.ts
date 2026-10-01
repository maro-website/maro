import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ user: vi.fn(), sign: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  getUserFromToken: mocks.user,
  supabaseServerConfigured: () => true,
  uploadValidatedImage: vi.fn(),
  getSupabaseAdmin: () => ({ storage: { from: () => ({ createSignedUrl: mocks.sign }) } }),
}));
import { GET } from "@/app/api/avatar/route";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://storage.test");
  mocks.user.mockReset();
  mocks.sign.mockReset().mockResolvedValue({ data: { signedUrl: "https://storage.test/fresh-avatar" }, error: null });
});

afterEach(() => vi.unstubAllEnvs());

describe("avatar recovery", () => {
  it("requires a signed-in user", async () => {
    mocks.user.mockResolvedValue(null);
    expect((await GET(new Request("https://maro.test/api/avatar"))).status).toBe(401);
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it("refreshes an old avatar in the now-private bucket", async () => {
    mocks.user.mockResolvedValue({ user_metadata: { avatar_url: "https://storage.test/storage/v1/object/public/generations/public/avatars/u/photo.png" } });
    const response = await GET(new Request("https://maro.test/api/avatar"));
    expect(await response.json()).toEqual({ url: "https://storage.test/fresh-avatar" });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.sign).toHaveBeenCalledWith("public/avatars/u/photo.png", expect.any(Number));
  });
  it.each([
    "storage:generations/victim/private.png",
    "storage:generations/public/avatars/../private.png",
    "https://foreign.test/storage/v1/object/public/generations/public/avatars/u/photo.png",
  ])("never signs arbitrary metadata paths: %s", async (avatar_url) => {
    mocks.user.mockResolvedValue({ user_metadata: { avatar_url } });
    expect(await (await GET(new Request("https://maro.test/api/avatar"))).json()).toEqual({ url: null });
    expect(mocks.sign).not.toHaveBeenCalled();
  });
});
