import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type UrlValidationResult = { ok: true; url: URL } | { ok: false; reason: string };

function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224 || (a === 198 && (b === 18 || b === 19))) return true;
  if (a === 192 && (b === 0 || b === 2)) return true;
  if (a === 198 && b === 51 && parts[2] === 100) return true;
  if (a === 203 && b === 0 && parts[2] === 113) return true;
  return false;
}

export function isBlockedNetworkHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  if (!host) return true;
  // URL normalizes dotted IPv4-mapped IPv6 into hex words. Classify the
  // normalized 128 bits, including expanded/mapped private IPv4 addresses.
  if (isIP(host) === 6) {
    const halves = host.split("::");
    const left = halves[0] ? halves[0].split(":") : [];
    const right = halves.length > 1 && halves[1] ? halves[1].split(":") : [];
    const words = halves.length > 1
      ? [...left, ...Array(8 - left.length - right.length).fill("0"), ...right]
      : left;
    const bytes = words.flatMap(w => {
      if (w.includes(".")) return w.split(".").map(Number);
      const n = parseInt(w, 16); return [n >> 8, n & 255];
    });
    if (bytes.slice(0, 10).every(b => b === 0) && bytes[10] === 255 && bytes[11] === 255) {
      return isPrivateIpv4(bytes.slice(12).join("."));
    }
    // Permit globally routed unicast only (2000::/3). This blocks loopback,
    // link-local, ULA, multicast, IPv4-compatible and translation encodings.
    if ((bytes[0] & 0xe0) !== 0x20) return true;
    if (bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] === 0x0d && bytes[3] === 0xb8) return true;
  }
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "::1" || host === "0:0:0:0:0:0:0:1") return true;
  if (host === "::" || host.startsWith("::ffff:127.") || host.startsWith("::ffff:10.")) return true;
  if (host.startsWith("::ffff:169.254.") || host.startsWith("::ffff:192.168.")) return true;
  if (/^::ffff:172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
  if (host === "metadata.google.internal") return true;
  if (host.endsWith(".internal")) return true;
  if (isPrivateIpv4(host)) return true;
  if (host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) return true;
  return false;
}

/** Restrict Chromium to existing asset providers; arbitrary domains could
 * change their DNS answer between our lookup and Chromium's connection. */
export function isTrustedThumbnailAsset(raw: string): boolean {
  const checked = validateOutboundHttpUrl(raw);
  if (!checked.ok || checked.url.protocol !== "https:" || checked.url.port) return false;
  const host = checked.url.hostname.toLowerCase();
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const storageHost = configured ? new URL(configured).hostname.toLowerCase() : null;
  return host === storageHost || host === "images.unsplash.com" || host === "picsum.photos" || host === "fastly.picsum.photos";
}

/** Validate outbound fetch targets for server-side user-controlled URLs. */
export function validateOutboundHttpUrl(raw: string): UrlValidationResult {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, reason: "invalid_url" };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, reason: "unsupported_scheme" };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "embedded_credentials" };
  }
  if (isBlockedNetworkHost(url.hostname)) {
    return { ok: false, reason: "blocked_host" };
  }

  return { ok: true, url };
}

/** Resolve DNS before a server-side browser request and reject any private answer. */
export async function validateResolvedOutboundHttpUrl(raw: string): Promise<UrlValidationResult> {
  const lexical = validateOutboundHttpUrl(raw);
  if (!lexical.ok) return lexical;
  const hostname = lexical.url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(hostname)) return lexical;
  try {
    const answers = await lookup(hostname, { all: true, verbatim: true });
    if (!answers.length || answers.some((answer) => isBlockedNetworkHost(answer.address))) {
      return { ok: false, reason: "blocked_dns_target" };
    }
  } catch {
    return { ok: false, reason: "dns_resolution_failed" };
  }
  return lexical;
}
