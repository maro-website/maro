import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isBlockedNetworkHost, validateOutboundHttpUrl } from "@/lib/security/ssrf";

export class BrandFetchError extends Error {}
export interface BrandResource { url: string; bytes: Buffer; contentType: string }

export function normalizeBrandUrl(raw: string): URL {
  const input = raw.trim();
  if (!input || input.length > 2048) throw new BrandFetchError("invalid_url");
  const checked = validateOutboundHttpUrl(/^[a-z][a-z\d+.-]*:/i.test(input) ? input : `https://${input}`);
  if (!checked.ok || checked.url.port || !checked.url.hostname.includes(".")) throw new BrandFetchError("invalid_url");
  checked.url.hash = "";
  // Do not crawl links carrying authentication or tracking query parameters.
  checked.url.search = "";
  return checked.url;
}

/** Pin the validated DNS answer into the actual socket, including each redirect. */
export async function fetchBrandResource(raw: string, options: { maxBytes: number; kind: "html" | "image"; signal: AbortSignal; origin?: string }): Promise<BrandResource> {
  let url = normalizeBrandUrl(raw);
  const signal = AbortSignal.any([options.signal, AbortSignal.timeout(6500)]);
  for (let redirect = 0; redirect <= 3; redirect++) {
    signal.throwIfAborted();
    if (options.origin && url.origin !== options.origin) throw new BrandFetchError("cross_origin_redirect");
    const host = url.hostname.replace(/^\[|\]$/g, "");
    const answers = isIP(host) ? [{ address: host, family: isIP(host) }] : await new Promise<Array<{ address: string; family: number }>>((resolve, reject) => {
      const abort = () => reject(new BrandFetchError("fetch_timeout"));
      signal.addEventListener("abort", abort, { once: true });
      lookup(host, { all: true, verbatim: true }).then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
    });
    signal.throwIfAborted();
    if (!answers.length || answers.some(answer => isBlockedNetworkHost(answer.address))) throw new BrandFetchError("blocked_host");
    const address = answers.find(answer => answer.family === 4) ?? answers[0];
    const response = await new Promise<{ status: number; location?: string; contentType: string; bytes: Buffer }>((resolve, reject) => {
      const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(url, {
        agent: false, signal,
        lookup: (_hostname, opts, callback) => {
          // Node may request an array for auto family selection. No second DNS lookup.
          if (typeof opts === "object" && opts.all) callback(null, [address]);
          else callback(null, address.address, address.family);
        },
        headers: { "User-Agent": "MaroBrandFetch/1.0 (+https://maro.al)", Accept: options.kind === "html" ? "text/html,application/xhtml+xml" : "image/*", "Accept-Encoding": "identity" },
      }, res => {
        const status = res.statusCode ?? 0;
        const contentType = (res.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
        if ([301,302,303,307,308].includes(status)) {
          resolve({ status, location: res.headers.location, contentType, bytes: Buffer.alloc(0) }); res.destroy(); return;
        }
        const allowed = options.kind === "html" ? ["text/html", "application/xhtml+xml"].includes(contentType) : ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif", "image/x-icon", "image/vnd.microsoft.icon", "application/octet-stream"].includes(contentType);
        if (status !== 200 || !allowed || (res.headers["content-encoding"] && res.headers["content-encoding"] !== "identity")) {
          reject(new BrandFetchError(status === 403 || status === 429 ? "site_blocked" : "unsupported_content")); res.destroy(); return;
        }
        if (Number(res.headers["content-length"] ?? 0) > options.maxBytes) { reject(new BrandFetchError("page_too_large")); res.destroy(); return; }
        const chunks: Buffer[] = []; let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > options.maxBytes) { reject(new BrandFetchError("page_too_large")); res.destroy(); }
          else chunks.push(chunk);
        });
        res.on("end", () => resolve({ status, contentType, bytes: Buffer.concat(chunks) }));
        res.on("error", reject);
        res.on("aborted", () => reject(new BrandFetchError("fetch_failed")));
      });
      request.on("error", reject); request.end();
    });
    if ([301,302,303,307,308].includes(response.status)) {
      if (!response.location || redirect === 3) throw new BrandFetchError("too_many_redirects");
      const next = normalizeBrandUrl(new URL(response.location, url).href);
      if (url.protocol === "https:" && next.protocol !== "https:") throw new BrandFetchError("unsafe_redirect");
      url = next; continue;
    }
    return { url: url.href, contentType: response.contentType, bytes: response.bytes };
  }
  throw new BrandFetchError("fetch_failed");
}
