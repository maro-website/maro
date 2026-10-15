import { Parser } from "htmlparser2";
import type { FetchedBrand, ImportTextKey } from "./types";

const clean = (value: unknown, max = 500) => typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
const orgTypes = new Set(["Organization", "Corporation", "LocalBusiness", "Store", "OnlineStore", "Restaurant", "CafeOrCoffeeShop", "Hotel", "Dentist", "MedicalBusiness", "ProfessionalService", "RealEstateAgent", "AutoDealer", "ClothingStore", "FoodEstablishment", "Brand"]);
const socialHosts: Record<string, string> = { "instagram.com": "Instagram", "facebook.com": "Facebook", "tiktok.com": "TikTok", "linkedin.com": "LinkedIn", "youtube.com": "YouTube", "youtu.be": "YouTube", "x.com": "X", "twitter.com": "X", "pinterest.com": "Pinterest" };
export function socialPlatform(raw: string): string | undefined {
  try { const host = new URL(raw).hostname.toLowerCase().replace(/^(www\.|m\.)/, ""); return socialHosts[host]; } catch { return undefined; }
}
export function publicLink(raw: unknown, base: string): string | undefined {
  if (typeof raw !== "string" || raw.length > 2048) return;
  try {
    const url = new URL(raw, base);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port || !url.hostname.includes(".")) return;
    url.hash = ""; url.search = ""; return url.href;
  } catch { return; }
}

export interface ParsedBrandPage { fields: FetchedBrand["fields"]; channels: FetchedBrand["channels"]; logos: FetchedBrand["logos"]; colors: string[]; follow: string[]; stylesheets: string[] }
export function brandColors(css: string): string[] {
  // Literal values are suggestions, never labelled as a verified brand palette.
  const preferred = css.match(/(?:--[\w-]*(?:brand|primary|accent)[\w-]*|theme-color)\s*:\s*#[\da-f]{3,8}\b/gi) ?? [];
  return [...new Set(preferred.map(value => value.match(/#[\da-f]{3,8}\b/i)?.[0].toUpperCase()).filter((v): v is string => Boolean(v && (v.length === 4 || v.length === 7))))].slice(0, 6);
}

export function extractBrandPage(html: string, url: string): ParsedBrandPage {
  const fields: FetchedBrand["fields"] = {}, channels: FetchedBrand["channels"] = [], logos: FetchedBrand["logos"] = [];
  const meta = new Map<string, string>(), follow: string[] = [], stylesheets: string[] = [], json: unknown[] = [];
  let title = "", h1 = "", language = "", css = "", script = "", scriptType = "", tag = "";
  const put = (key: ImportTextKey, value: unknown, max = key === "description" ? 1800 : 240) => { const text = clean(value, max); if (text && !fields[key]) fields[key] = { value: text, source: url }; };
  const addChannel = (raw: unknown) => {
    const handle = publicLink(raw, url), platform = handle && socialPlatform(handle);
    if (handle && platform && new URL(handle).pathname !== "/" && !/\/(?:sharer|share|intent|watch|reel|reels|p|status)\b/i.test(new URL(handle).pathname) && !channels.some(c => c.handle === handle) && channels.length < 12) channels.push({ platform, handle });
  };
  const addLogo = (raw: unknown, kind: "logo" | "icon") => {
    const href = publicLink(raw, url);
    if (href && !logos.some(logo => logo.url === href) && logos.length < 12) logos.push({ url: href, kind, source: url });
  };
  new Parser({
    onopentag(name, a) {
      tag = name;
      if (name === "html") language = a.lang ?? "";
      if (name === "meta") { const key = (a.property ?? a.name ?? "").toLowerCase(); if (!meta.has(key)) meta.set(key, clean(a.content, 2000)); }
      if (name === "script") { scriptType = (a.type ?? "").toLowerCase(); script = ""; }
      if (name === "link") {
        const rel = (a.rel ?? "").toLowerCase();
        if (rel.includes("icon")) addLogo(a.href, "icon");
        if (rel === "stylesheet") { const href = publicLink(a.href, url); if (href && new URL(href).origin === new URL(url).origin && stylesheets.length < 3) stylesheets.push(href); }
      }
      if (a.style) css += ` ${a.style.slice(0, 2000)}`;
      if (name === "img" && /logo|brand/i.test(`${a.alt ?? ""} ${a.class ?? ""} ${a.id ?? ""} ${a.src ?? ""}`) && !/product|partner|client|payment/i.test(`${a.alt ?? ""} ${a.class ?? ""}`)) addLogo(a.src || a["data-src"], "logo");
      if (name === "a") {
        addChannel(a.href);
        if (a.href?.startsWith("tel:")) put("phone", a.href.slice(4).split("?")[0]);
        const href = publicLink(a.href, url);
        if (href && new URL(href).origin === new URL(url).origin && /\/(?:about(?:-us)?|contact(?:-us)?|rreth-nesh|kontakt|ueber-uns|uber-uns)\/?$/i.test(new URL(href).pathname) && !follow.includes(href) && follow.length < 4) follow.push(href);
      }
    },
    ontext(text) {
      if (tag === "script" && scriptType === "application/ld+json" && script.length < 128000) script += text;
      if (tag === "title" && title.length < 400) title += text;
      if (tag === "h1" && h1.length < 400) h1 += text;
      if (tag === "style" && css.length < 128000) css += text;
    },
    onclosetag(name) {
      if (name === "script" && scriptType === "application/ld+json") { try { json.push(JSON.parse(script)); } catch { /* Invalid structured data is ignored. */ } scriptType = ""; }
      tag = "";
    },
  }, { decodeEntities: true }).end(html);

  // Bounded traversal of structured data; ignore Product/Article/Person names.
  let visited = 0;
  const visit = (node: unknown, depth = 0) => {
    if (!node || typeof node !== "object" || depth > 8 || ++visited > 250) return;
    if (Array.isArray(node)) { node.slice(0, 40).forEach(child => visit(child, depth + 1)); return; }
    const item = node as Record<string, unknown>;
    const types = Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]];
    if (types.some(type => typeof type === "string" && orgTypes.has(type.replace(/^https?:\/\/schema.org\//, "")))) {
      put("name", item.name); put("description", item.description); put("phone", item.telephone);
      const logo = item.logo && typeof item.logo === "object" ? (item.logo as Record<string, unknown>).url ?? (item.logo as Record<string, unknown>).contentUrl : item.logo;
      addLogo(logo, "logo");
      if (item.address && typeof item.address === "object") {
        const address = item.address as Record<string, unknown>;
        put("location", [address.streetAddress, address.addressLocality, address.addressRegion, address.postalCode, typeof address.addressCountry === "object" ? (address.addressCountry as Record<string, unknown>)?.name : address.addressCountry].map(v => clean(v)).filter(Boolean).join(", "));
      } else put("location", item.address);
      (Array.isArray(item.sameAs) ? item.sameAs : [item.sameAs]).slice(0, 20).forEach(addChannel);
    }
    for (const value of Object.values(item).slice(0, 40)) visit(value, depth + 1);
  };
  json.forEach(node => visit(node));
  put("name", meta.get("og:site_name") || title.split(/\s+[|–—]\s+/)[0] || meta.get("og:title") || h1);
  put("description", meta.get("description") || meta.get("og:description") || meta.get("twitter:description"));
  put("language", language || meta.get("og:locale"));
  put("website", url);
  const colors = brandColors(css);
  const theme = meta.get("theme-color");
  if (theme && /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(theme) && colors.length < 6 && !colors.includes(theme.toUpperCase())) colors.push(theme.toUpperCase());
  // Icons are last. og:image is never treated as a logo.
  logos.sort((a, b) => Number(a.kind === "icon") - Number(b.kind === "icon"));
  return { fields, channels, logos, colors, follow, stylesheets };
}
