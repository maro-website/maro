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
  return false;
}

export function isBlockedNetworkHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  if (!host) return true;
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
