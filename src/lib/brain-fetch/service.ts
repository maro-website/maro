import "server-only";
import sharp from "sharp";
import { extractBrandPage, socialPlatform } from "./extract";
import { BrandFetchError, fetchBrandResource, normalizeBrandUrl } from "./network";
import type { FetchedBrand } from "./types";

const cache = new Map<string, { expires: number; result: FetchedBrand }>();
export async function fetchBrand(raw: string, accountKey: string): Promise<FetchedBrand> {
  const url = normalizeBrandUrl(raw);
  const key = `${accountKey}:${url.href}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.result;
  const signal = AbortSignal.timeout(18000);
  const first = await fetchBrandResource(url.href, { maxBytes: 1024 * 1024, kind: "html", signal });
  const initial = extractBrandPage(first.bytes.toString("utf8"), first.url);
  const social = socialPlatform(first.url);
  if (social && (!initial.fields.name || /^(?:Instagram|Facebook|TikTok|LinkedIn|YouTube|X|Log in|Login|Sign in)(?:\s*[-|·]|$)/i.test(initial.fields.name.value))) throw new BrandFetchError("site_blocked");
  const result: FetchedBrand = { fields: initial.fields, channels: initial.channels, logos: initial.logos, colors: initial.colors, pages: [first.url], warnings: [], fetchedAt: new Date().toISOString(), aiUsed: false };
  if (social) {
    // A social profile is a source; it must not replace the brand's own website.
    delete result.fields.website;
    result.channels.unshift({ platform: social, handle: first.url });
    result.warnings.push("U lexuan vetëm të dhënat publike të profilit. Për import më të plotë përdor website-in e biznesit.");
  }
  for (const next of initial.follow.slice(0, 2)) {
    if (signal.aborted || result.pages.includes(next)) break;
    try {
      const page = await fetchBrandResource(next, { maxBytes: 768 * 1024, kind: "html", signal, origin: new URL(first.url).origin });
      const data = extractBrandPage(page.bytes.toString("utf8"), page.url);
      result.pages.push(page.url);
      for (const [field, fact] of Object.entries(data.fields)) if (!result.fields[field as keyof typeof result.fields]) result.fields[field as keyof typeof result.fields] = fact;
      for (const channel of data.channels) if (!result.channels.some(c => c.handle === channel.handle) && result.channels.length < 12) result.channels.push(channel);
      for (const logo of data.logos) if (!result.logos.some(l => l.url === logo.url) && result.logos.length < 8) result.logos.push(logo);
    } catch { result.warnings.push("Një faqe shtesë nuk u lexua. Rezultatet përfshijnë faqet e lexuara me sukses."); }
  }
  result.logos = result.logos.slice(0, 8);
  if (!result.fields.name && !result.fields.description && !result.logos.length) throw new BrandFetchError("brand_not_found");
  if (!result.colors.length) result.warnings.push("Nuk u gjetën ngjyra të deklaruara në faqen e lexuar.");
  result.warnings = [...new Set(result.warnings)];
  for (const [entry, value] of cache) if (value.expires <= Date.now()) cache.delete(entry);
  if (cache.size >= 24) cache.delete(cache.keys().next().value!);
  cache.set(key, { expires: Date.now() + 15 * 60 * 1000, result });
  return result;
}

/** Convert external logos into bounded raster data. Never serve remote SVG markup. */
export async function fetchBrandLogo(url: string): Promise<string> {
  const image = await fetchBrandResource(url, { maxBytes: 1024 * 1024, kind: "image", signal: AbortSignal.timeout(9000) });
  const bytes = image.bytes;
  const raster = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) || bytes.subarray(0, 6).toString("ascii").startsWith("GIF8") || (bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP");
  if (!raster) {
    const svg = bytes.toString("utf8");
    if (!/<svg[\s>]/i.test(svg) || /<!DOCTYPE|<!ENTITY|<\s*(?:script|foreignObject|image|use)\b|(?:href|src)\s*=|@import|url\s*\(/i.test(svg)) throw new BrandFetchError("unsupported_logo");
  }
  try {
    const png = await sharp(image.bytes, { limitInputPixels: 16_000_000, animated: false }).timeout({ seconds: 3 }).resize({ width: 640, height: 320, fit: "inside", withoutEnlargement: true }).png().toBuffer();
    if (png.length > 1024 * 1024) throw new BrandFetchError("unsupported_logo");
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch { throw new BrandFetchError("unsupported_logo"); }
}
