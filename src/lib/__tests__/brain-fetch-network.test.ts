import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ lookup: vi.fn(), request: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: mocks.lookup }));
vi.mock("node:https", () => ({ request: mocks.request }));
vi.mock("node:http", () => ({ request: mocks.request }));
import { fetchBrandResource, normalizeBrandUrl } from "@/lib/brain-fetch/network";
const options = () => ({ maxBytes: 20, kind: "html" as const, signal: AbortSignal.timeout(1000) });
function reply(status: number, headers: Record<string, string>, body = "ok") {
  mocks.request.mockImplementationOnce((_url, _options, callback) => {
    const req = new EventEmitter() as EventEmitter & { end: () => void };
    req.end = () => {
      const res = Object.assign(new EventEmitter(), { statusCode: status, headers, destroy: vi.fn() });
      callback(res); res.emit("data", Buffer.from(body)); res.emit("end");
    };
    return req;
  });
}
beforeEach(() => { vi.resetAllMocks(); mocks.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]); });
describe("Fetch Brand network boundary", () => {
  it("pins the checked public address into the request instead of resolving DNS again", async () => {
    reply(200, { "content-type": "text/html" });
    expect((await fetchBrandResource("https://example.test", options())).bytes.toString()).toBe("ok");
    const settings = mocks.request.mock.calls[0][1], done = vi.fn();
    settings.lookup("example.test", { all: true }, done);
    expect(done).toHaveBeenCalledWith(null, [{ address: "93.184.216.34", family: 4 }]);
    expect(settings.agent).toBe(false); expect(settings.headers.Authorization).toBeUndefined(); expect(settings.headers.Cookie).toBeUndefined();
  });
  it("rejects mixed public/private DNS answers before making a connection", async () => {
    mocks.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }, { address: "169.254.169.254", family: 4 }]);
    await expect(fetchBrandResource("https://example.test", options())).rejects.toThrow("blocked_host"); expect(mocks.request).not.toHaveBeenCalled();
  });
  it("validates redirect targets, blocks metadata/private targets and HTTPS downgrades", async () => {
    reply(302, { location: "http://169.254.169.254/latest/meta-data" });
    await expect(fetchBrandResource("https://example.test", options())).rejects.toThrow("invalid_url");
    reply(302, { location: "http://example.test/plain" });
    await expect(fetchBrandResource("https://example.test", options())).rejects.toThrow("unsafe_redirect");
    expect(mocks.request).toHaveBeenCalledTimes(2);
  });
  it("bounds streamed bodies, rejects compressed data and prevents follow-page cross-origin redirects", async () => {
    reply(200, { "content-type": "text/html" }, "x".repeat(21));
    await expect(fetchBrandResource("https://example.test", options())).rejects.toThrow("page_too_large");
    reply(200, { "content-type": "text/html", "content-encoding": "gzip" });
    await expect(fetchBrandResource("https://example.test", options())).rejects.toThrow("unsupported_content");
    reply(302, { location: "https://other.test/about" });
    await expect(fetchBrandResource("https://example.test/about", { ...options(), origin: "https://example.test" })).rejects.toThrow("cross_origin_redirect");
  });
  it("normalizes domains and strips credentials-bearing queries from crawl URLs", () => {
    expect(normalizeBrandUrl("example.test?token=private#fragment").href).toBe("https://example.test/");
    expect(() => normalizeBrandUrl("http://[::ffff:127.0.0.1]/")).toThrow();
    expect(() => normalizeBrandUrl("https://service.railway.internal/")).toThrow();
  });
});
