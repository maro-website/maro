import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ resource: vi.fn() }));
vi.mock("@/lib/brain-fetch/network", async () => ({ ...await vi.importActual<typeof import("@/lib/brain-fetch/network")>("@/lib/brain-fetch/network"), fetchBrandResource: mocks.resource }));
import { fetchBrand, fetchBrandLogo } from "@/lib/brain-fetch/service";
beforeEach(() => { vi.clearAllMocks(); });
describe("bounded no-AI brand import", () => {
  it("crawls no more than the homepage and two contact/about pages, retaining evidence and owner-scoped cache", async () => {
    mocks.resource.mockImplementation(async (url: string) => ({ url, bytes: Buffer.from(`<title>Example</title><a href="/contact">Contact</a><a href="/about-us">About</a><a href="/kontakt">More</a>`), contentType: "text/html" }));
    const result = await fetchBrand("https://example.test", "owner-a:workspace-a");
    expect(result.pages).toHaveLength(3); expect(result.aiUsed).toBe(false); expect(mocks.resource).toHaveBeenCalledTimes(3);
    await fetchBrand("https://example.test", "owner-a:workspace-a"); expect(mocks.resource).toHaveBeenCalledTimes(3);
    await fetchBrand("https://example.test", "owner-b:workspace-a"); expect(mocks.resource).toHaveBeenCalledTimes(6);
  });
  it("returns successful pages if an optional contact page fails", async () => {
    mocks.resource.mockResolvedValueOnce({ url: "https://partial.test/", bytes: Buffer.from('<title>Partial</title><a href="/contact">Contact</a>'), contentType: "text/html" }).mockRejectedValueOnce(new Error("blocked"));
    const result = await fetchBrand("https://partial.test", "partial");
    expect(result.fields.name?.value).toBe("Partial"); expect(result.pages).toHaveLength(1); expect(result.warnings.length).toBeGreaterThan(0);
  });
  it("rejects social login walls instead of importing Instagram as the business", async () => {
    mocks.resource.mockResolvedValueOnce({ url: "https://instagram.com/test/", bytes: Buffer.from("<title>Instagram</title>"), contentType: "text/html" });
    await expect(fetchBrand("https://instagram.com/test/", "social")).rejects.toThrow("site_blocked");
  });
  it("rasterizes simple SVG and removes original metadata from the browser response", async () => {
    mocks.resource.mockResolvedValueOnce({ url: "https://example.test/logo.svg", contentType: "image/svg+xml", bytes: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><rect width="80" height="40" fill="#a12345"/></svg>') });
    const result = await fetchBrandLogo("https://example.test/logo.svg");
    expect(result.startsWith("data:image/png;base64,")).toBe(true);
    expect((await sharp(Buffer.from(result.split(",")[1], "base64")).metadata()).format).toBe("png");
  });
  it.each(["image/svg+xml", "application/octet-stream"])("rejects external SVG resources even with %s MIME", async contentType => {
    mocks.resource.mockResolvedValueOnce({ url: "https://example.test/logo", contentType, bytes: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><image href="http://169.254.169.254/secret"/></svg>') });
    await expect(fetchBrandLogo("https://example.test/logo")).rejects.toThrow("unsupported_logo");
  });
  it("rejects non-image content and decompression bombs", async () => {
    mocks.resource.mockResolvedValueOnce({ url: "https://example.test/logo", contentType: "image/png", bytes: Buffer.from("<html>not an image</html>") });
    await expect(fetchBrandLogo("https://example.test/logo")).rejects.toThrow("unsupported_logo");
    const huge = await sharp({ create: { width: 4100, height: 4100, channels: 3, background: "white" } }).png().toBuffer();
    mocks.resource.mockResolvedValueOnce({ url: "https://example.test/huge.png", contentType: "image/png", bytes: huge });
    await expect(fetchBrandLogo("https://example.test/huge.png")).rejects.toThrow("unsupported_logo");
  });
});
