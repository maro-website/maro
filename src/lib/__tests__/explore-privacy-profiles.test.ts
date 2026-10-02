import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH, DELETE } from "@/app/api/explore/route";
import { GET as getProfile, PATCH as updateProfile } from "@/app/api/profiles/route";
import { exploreResponse } from "@/lib/explore/server";
const mocks = vi.hoisted(() => ({ user: vi.fn(), admin: vi.fn(), result: { data: null as unknown, error: null as unknown }, eq: vi.fn(), update: vi.fn(), select: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdmin: mocks.admin, getUserFromToken: mocks.user,
  supabaseServerConfigured: () => true, resolveAssetForClient: async (url: string) => url, publishStoredUrlToExplore: vi.fn() }));
const alice = "11111111-1111-4111-8111-111111111111", bob = "22222222-2222-4222-8222-222222222222";
const post = "33333333-3333-4333-8333-333333333333";
const row = { id: post, user_id: alice, prompt: "PRIVATE PROMPT", selections: { format: "4:3" },
  show_prompt: false, show_settings: false, url: "https://example.invalid/image.png", slug: "creation",
  internal: "PRIVATE INTERNAL", tool_id: "reklama", author: "Author" };
function request(method = "GET", body?: unknown, suffix = "") {
  return new Request(`https://maro.test/api/explore${suffix}`, { method, headers: { Authorization: "Bearer token", "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.user.mockResolvedValue({ id: bob }); mocks.result = { data: null, error: null };
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "is", "in", "order", "returns", "range", "update"]) builder[method] = vi.fn((...args: unknown[]) => {
    if (method === "eq") mocks.eq(...args);
    if (method === "update") mocks.update(...args);
    if (method === "select") mocks.select(...args);
    return builder;
  });
  builder.maybeSingle = builder.single = vi.fn(async () => mocks.result);
  builder.then = (resolve: (result: unknown) => unknown) => Promise.resolve(mocks.result).then(resolve);
  mocks.admin.mockReturnValue({ from: () => builder });
});
describe("Explore privacy and ownership boundary", () => {
  it("strips private prompt/settings/internal fields from public responses", async () => {
    const result = await exploreResponse(row);
    expect(result.prompt).toBe(""); expect(result.selections).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain("PRIVATE");
  });
  it("treats prompt and settings visibility independently", async () => {
    const result = await exploreResponse({ ...row, show_prompt: true });
    expect(result.prompt).toBe("PRIVATE PROMPT"); expect(result.selections).toBeUndefined();
    const settings = await exploreResponse({ ...row, show_settings: true });
    expect(settings.prompt).toBe(""); expect(settings.selections).toEqual({ format: "4:3" });
  });
  it("allows the verified owner management view to edit private content", async () => {
    expect(await exploreResponse(row, true)).toMatchObject({ prompt: "PRIVATE PROMPT", selections: { format: "4:3" } });
    mocks.user.mockResolvedValue(null);
    expect((await GET(request("GET", undefined, "?mine=1"))).status).toBe(401);
    expect((await GET(request("GET", undefined, "?saved=1"))).status).toBe(401);
  });
  it.each([PATCH, DELETE])("scopes edits/deletion to the token owner, never a submitted user ID", async handler => {
    const response = await handler(request(handler === PATCH ? "PATCH" : "DELETE", { id: post, userId: alice, showPrompt: true }));
    expect(response.status).toBe(404);
    expect(mocks.eq).toHaveBeenCalledWith("user_id", bob);
    expect(mocks.eq).toHaveBeenCalledWith("id", post);
    expect(mocks.update).toHaveBeenCalledWith(expect.not.objectContaining({ user_id: alice }));
  });
  it("unpublishes reversibly, without deleting the paid generation", async () => {
    mocks.result.data = { id: post };
    expect((await DELETE(request("DELETE", { id: post }))).status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({ deleted_at: expect.any(String) });
    expect((await PATCH(request("PATCH", { id: post, restore: true }))).status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ deleted_at: null }));
  });
});
describe("public profile and editable username", () => {
  it("returns an existing profile with no publications and no email/credits", async () => {
    mocks.result.data = { id: alice, full_name: "Author", username: "erzenology", avatar_url: null, email: "private@example.invalid", credits: 1234 };
    const response = await getProfile(request("GET", undefined, "?user=erzenology"));
    expect(await response.json()).toEqual({ profile: { id: alice, name: "Author", username: "erzenology", avatarUrl: null } });
    expect(mocks.select).toHaveBeenCalledWith("id,full_name,username,avatar_url");
  });
  it("preserves UUID lookup and saves handles only for the authenticated profile", async () => {
    await getProfile(request("GET", undefined, `?user=${alice}`));
    expect(mocks.eq).toHaveBeenCalledWith("id", alice);
    mocks.result.data = { username: "erzenology" };
    expect((await updateProfile(request("PATCH", { username: "@Erzenology", userId: alice }))).status).toBe(200);
    expect(mocks.eq).toHaveBeenCalledWith("id", bob);
    expect(mocks.update).toHaveBeenCalledWith({ username: "erzenology" });
  });
  it("reports uniqueness conflicts and denies anonymous/invalid updates", async () => {
    mocks.result.error = { code: "23505" };
    expect((await updateProfile(request("PATCH", { username: "erzenology" }))).status).toBe(409);
    expect((await updateProfile(request("PATCH", { username: "admin" }))).status).toBe(400);
    mocks.user.mockResolvedValue(null);
    expect((await updateProfile(request("PATCH", { username: "erzenology" }))).status).toBe(401);
  });
});
