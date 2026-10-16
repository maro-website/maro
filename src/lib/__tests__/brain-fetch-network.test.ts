import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ lookup: vi.fn(), request: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: mocks.lookup }));
vi.mock("node:https", () => ({ request: mocks.request }));
vi.mock("node:http", () => ({ request: mocks.request }));
import { fetchBrandResource, normalizeBrandUrl } from "@/lib/brain-fetch/network";
const options = () => ({ maxBytes: 20, kind: "html" as const, signal: AbortSignal.timeout(1000) });
function reply(status: number, headers: Record<string, string>, body: string | Buffer[] = "ok", abortOnDestroy = false) {
  const destroy = vi.fn();
  mocks.request.mockImplementationOnce((_url, _options, callback) => {
    const req = new EventEmitter() as EventEmitter & { end: () => void };
    req.end = () => {
      const res = Object.assign(new EventEmitter(), { statusCode: status, headers, destroy });
      if (abortOnDestroy) destroy.mockImplementation(() => { res.emit("aborted"); res.emit("error", new Error("intentional close")); });
      callback(res);
      for (const chunk of typeof body === "string" ? [Buffer.from(body)] : body) res.emit("data", chunk);
      res.emit("end");
    };
    return req;
  });
  return destroy;
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
  it("returns bounded HTML prefixes, rejects compressed data and prevents cross-origin follow-page redirects", async () => {
    reply(200, { "content-type": "text/html" }, "x".repeat(21));
    expect(await fetchBrandResource("https://example.test", options())).toMatchObject({ bytes: Buffer.from("x".repeat(20)), truncated: true });
    reply(200, { "content-type": "text/html", "content-encoding": "gzip" });
    await expect(fetchBrandResource("https://example.test", options())).rejects.toThrow("unsupported_content");
    reply(302, { location: "https://other.test/about" });
    await expect(fetchBrandResource("https://example.test/about", { ...options(), origin: "https://example.test" })).rejects.toThrow("cross_origin_redirect");
  });
  it("reads the prefix of a declared large HTML page and closes the connection at the existing byte cap", async () => {
    const destroy = reply(200, { "content-type": "text/html", "content-length": "10000000" }, [Buffer.from("<title>Shop</title>x"), Buffer.from("never retained")], true);
    const result = await fetchBrandResource("https://large.test", options());
    expect(result.bytes).toEqual(Buffer.from("<title>Shop</title>x"));
    expect(result.truncated).toBe(true); expect(destroy).toHaveBeenCalledOnce();
  });
  it("keeps only a byte-bounded prefix across chunks and ignores events after intentional truncation", async () => {
    const bytes = Buffer.from("<title>Më shumë</title>".repeat(20));
    const destroy = reply(200, { "content-type": "text/html" }, [bytes.subarray(0, 7), bytes.subarray(7), Buffer.alloc(10000)], true);
    const result = await fetchBrandResource("https://chunks.test", options());
    expect(result.bytes).toEqual(bytes.subarray(0, 20)); expect(result.truncated).toBe(true); expect(destroy).toHaveBeenCalledOnce();
  });
  it("does not mark a complete body at the exact cap as partial", async () => {
    reply(200, { "content-type": "text/html", "content-length": "20" }, "x".repeat(20));
    const result = await fetchBrandResource("https://exact.test", options());
    expect(result.bytes).toHaveLength(20); expect(result.truncated).toBeUndefined();
  });
  it.each([true, false])("still rejects oversized images completely (declared size: %s)", async declared => {
    reply(200, { "content-type": "image/png", ...(declared ? { "content-length": "21" } : {}) }, "x".repeat(21));
    await expect(fetchBrandResource("https://image.test/logo.png", { ...options(), kind: "image" })).rejects.toThrow("page_too_large");
  });
  it("normalizes domains and strips credentials-bearing queries from crawl URLs", () => {
    expect(normalizeBrandUrl("example.test?token=private#fragment").href).toBe("https://example.test/");
    expect(() => normalizeBrandUrl("http://[::ffff:127.0.0.1]/")).toThrow();
    expect(() => normalizeBrandUrl("https://service.railway.internal/")).toThrow();
  });
});
