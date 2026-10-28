import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { POST } from "@/app/api/moods/upload/route";
import { StyleError } from "@/lib/moods/server";
const owner = "11111111-1111-4111-8111-111111111111";
const mocks = vi.hoisted(() => ({ token: vi.fn(), upload: vi.fn(), sign: vi.fn(), moderate: vi.fn(), rate: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getUserFromToken: mocks.token, getSupabaseAdmin: () => ({ storage: { from: () => ({ upload: mocks.upload, createSignedUrl: mocks.sign }) } }) }));
vi.mock("@/lib/moods/ai", () => ({ moderateStyle: mocks.moderate }));
vi.mock("@/lib/moods/mutations", () => ({ styleRateLimit: mocks.rate }));
vi.mock("@/lib/admin/auth", () => ({ requirePermission: vi.fn() }));
const request = (dataUrl: string) => new Request("https://maro.al/api/moods/upload", { method: "POST", headers: { Authorization: "Bearer synthetic" }, body: JSON.stringify({ dataUrl }) });
const png = async () => `data:image/png;base64,${(await sharp({ create: { width: 16, height: 16, channels: 3, background: "#aabbcc" } }).png().toBuffer()).toString("base64")}`;
beforeEach(() => {
  vi.clearAllMocks(); mocks.token.mockResolvedValue({ id: owner, email: "erzen@nice.al" });
  mocks.upload.mockResolvedValue({ error: null }); mocks.sign.mockResolvedValue({ data: { signedUrl: "https://example.test/temporary" }, error: null });
  mocks.moderate.mockResolvedValue(undefined); mocks.rate.mockResolvedValue(undefined);
});
describe("private style thumbnails", () => {
  it("re-encodes a valid image and moderates before storing under the authenticated identity", async () => {
    const response = await POST(request(await png())); expect(response.status).toBe(200);
    const body = await response.json(); expect(body.cover_ref).toMatch(new RegExp(`^storage:generations/_moods/${owner}/[a-f0-9-]+\\.webp$`));
    expect(mocks.upload).toHaveBeenCalledWith(expect.stringContaining(`_moods/${owner}/`), expect.any(Buffer), { contentType: "image/webp", upsert: false });
    const metadata = await sharp(mocks.upload.mock.calls[0][1]).metadata(); expect(metadata.format).toBe("webp");
    expect(mocks.moderate.mock.invocationCallOrder[0]).toBeLessThan(mocks.upload.mock.invocationCallOrder[0]);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("does not persist a flagged image", async () => {
    mocks.moderate.mockRejectedValue(new StyleError("style_content_rejected", 422));
    expect((await POST(request(await png()))).status).toBe(422); expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("rejects SVG and mismatched MIME types before provider work", async () => {
    for (const data of ["data:image/svg+xml;base64,PHN2Zz4=", (await png()).replace("image/png", "image/jpeg")]) expect((await POST(request(data))).status).toBe(400);
    expect(mocks.moderate).not.toHaveBeenCalled(); expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("requires authentication before reading or processing an upload", async () => {
    mocks.token.mockResolvedValue(null); expect((await POST(request("invalid"))).status).toBe(401); expect(mocks.moderate).not.toHaveBeenCalled();
  });
  it("keeps uploads private when moderation is unavailable", async () => {
    mocks.moderate.mockRejectedValue(new Error("private provider details"));
    const response = await POST(request(await png())); expect(response.status).toBe(503); expect(await response.text()).not.toContain("private provider details"); expect(mocks.upload).not.toHaveBeenCalled();
  });
});
