import "server-only";

/** Decoded raster image limit for user avatars and reference uploads (5 MiB). */
export const MAX_USER_IMAGE_BYTES = 5 * 1024 * 1024;

/** Private maroImazh/maroLogo references may be normal phone/design exports. */
export const MAX_IMAGE_REFERENCE_BYTES = 25 * 1024 * 1024;

/** Admin banner uploads may be slightly larger (8 MiB decoded). */
export const MAX_ADMIN_RASTER_BYTES = 8 * 1024 * 1024;

/** Trusted AI provider PNG output (15 MiB decoded). */
export const MAX_GENERATED_IMAGE_BYTES = 15 * 1024 * 1024;

/** Trusted AI provider MP3 output (20 MiB decoded). */
export const MAX_GENERATED_AUDIO_BYTES = 20 * 1024 * 1024;

/** Admin SVG markup limit (512 KiB). */
export const MAX_SVG_MARKUP_BYTES = 512 * 1024;

export type AllowedRasterKind = "png" | "jpeg" | "webp";

export type UploadValidationResult =
  | {
      ok: true;
      bytes: Buffer;
      mediaType: AllowedRasterKind;
      mime: string;
      storageKey: string;
      extension: "png" | "jpg" | "webp";
    }
  | { ok: false; reason: string };

const DATA_URL_RE =
  /^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=\s]+)$/i;

export function detectRasterKind(bytes: Buffer): AllowedRasterKind | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  return null;
}

export function mimeForKind(kind: AllowedRasterKind): string {
  if (kind === "png") return "image/png";
  if (kind === "webp") return "image/webp";
  return "image/jpeg";
}

export function extensionForKind(kind: AllowedRasterKind): "png" | "jpg" | "webp" {
  if (kind === "png") return "png";
  if (kind === "webp") return "webp";
  return "jpg";
}

function claimedKindFromMime(mime: string): AllowedRasterKind | null {
  const m = mime.toLowerCase();
  if (m === "image/png") return "png";
  if (m === "image/jpeg" || m === "image/jpg") return "jpeg";
  if (m === "image/webp") return "webp";
  return null;
}

function parseBase64Payload(b64: string): Buffer | null {
  const compact = b64.replace(/\s+/g, "");
  if (!compact || compact.length % 4 === 1) return null;
  if (!/^[A-Za-z0-9+/=]+$/.test(compact)) return null;
  try {
    return Buffer.from(compact, "base64");
  } catch {
    return null;
  }
}

export function buildStorageKey(
  prefix: string,
  userId: string,
  extension: string
): string {
  const safeUser = userId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 64);
  const safePrefix = prefix.replace(/[^a-zA-Z0-9/_-]/g, "_").slice(0, 80);
  return `${safePrefix}/${safeUser}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
}

export function validateRasterUpload(input: {
  dataUrl: string;
  maxBytes: number;
  storagePrefix: string;
  userId: string;
}): UploadValidationResult {
  const trimmed = input.dataUrl.trim();
  const match = DATA_URL_RE.exec(trimmed);
  if (!match) return { ok: false, reason: "invalid_data_url" };

  const claimedMime = match[1].toLowerCase();
  const claimedKind = claimedKindFromMime(claimedMime);
  if (!claimedKind) return { ok: false, reason: "unsupported_mime" };

  const bytes = parseBase64Payload(match[2]);
  if (!bytes || bytes.length === 0) return { ok: false, reason: "invalid_base64" };
  if (bytes.length > input.maxBytes) return { ok: false, reason: "file_too_large" };

  const detected = detectRasterKind(bytes);
  if (!detected) return { ok: false, reason: "invalid_magic_bytes" };
  if (detected !== claimedKind) return { ok: false, reason: "mime_mismatch" };

  return {
    ok: true,
    bytes,
    mediaType: detected,
    mime: mimeForKind(detected),
    extension: extensionForKind(detected),
    storageKey: buildStorageKey(input.storagePrefix, input.userId, extensionForKind(detected)),
  };
}

export function validateRasterBytes(
  bytes: Buffer,
  maxBytes: number,
  claimedMime?: string
):
  | { ok: true; bytes: Buffer; mediaType: AllowedRasterKind; mime: string; extension: "png" | "jpg" | "webp" }
  | { ok: false; reason: string } {
  if (!bytes.length) return { ok: false, reason: "invalid_file" };
  if (bytes.length > maxBytes) return { ok: false, reason: "file_too_large" };
  const detected = detectRasterKind(bytes);
  if (!detected) return { ok: false, reason: "invalid_magic_bytes" };
  if (claimedMime) {
    const claimed = claimedKindFromMime(claimedMime);
    if (!claimed) return { ok: false, reason: "unsupported_mime" };
    if (claimed !== detected) return { ok: false, reason: "mime_mismatch" };
  }
  return {
    ok: true,
    bytes,
    mediaType: detected,
    mime: mimeForKind(detected),
    extension: extensionForKind(detected),
  };
}

export function validateProviderImageBytes(
  b64: string,
  maxBytes = MAX_GENERATED_IMAGE_BYTES
): { ok: true; bytes: Buffer } | { ok: false; reason: string } {
  const bytes = parseBase64Payload(b64);
  if (!bytes || bytes.length === 0) return { ok: false, reason: "invalid_base64" };
  if (bytes.length > maxBytes) return { ok: false, reason: "file_too_large" };
  const detected = detectRasterKind(bytes);
  if (!detected) return { ok: false, reason: "invalid_magic_bytes" };
  return { ok: true, bytes };
}

export function validateProviderAudioBytes(
  b64: string,
  maxBytes = MAX_GENERATED_AUDIO_BYTES
): { ok: true; bytes: Buffer } | { ok: false; reason: string } {
  const bytes = parseBase64Payload(b64);
  if (!bytes || bytes.length === 0) return { ok: false, reason: "invalid_base64" };
  if (bytes.length > maxBytes) return { ok: false, reason: "file_too_large" };
  if (bytes.length < 16) return { ok: false, reason: "invalid_audio" };
  return { ok: true, bytes };
}

export type SvgValidationResult =
  | { ok: true; svg: string; bytes: Buffer }
  | { ok: false; reason: string };

const SVG_BLOCKED_PATTERNS = [
  /<!doctype/i,
  /<!entity/i,
  /<\?xml-stylesheet/i,
  /<script[\s>]/i,
  /<foreignobject/i,
  /<iframe/i,
  /<object/i,
  /<embed/i,
  /javascript:/i,
  /data:text\/html/i,
];

export function decodeSvgDataUrl(dataUrl: string): string | null {
  const trimmed = dataUrl.trim();
  const b64 = trimmed.match(/^data:image\/svg\+xml;base64,(.+)$/i);
  if (b64) {
    const bytes = parseBase64Payload(b64[1]);
    return bytes ? bytes.toString("utf-8") : null;
  }
  const uri = trimmed.match(/^data:image\/svg\+xml,(.+)$/i);
  if (uri) {
    try {
      return decodeURIComponent(uri[1]);
    } catch {
      return null;
    }
  }
  return null;
}

export function sanitizeSvgMarkup(raw: string): SvgValidationResult {
  const svg = raw.trim();
  if (!svg || !/<svg[\s>]/i.test(svg)) return { ok: false, reason: "invalid_svg" };
  if (svg.length > MAX_SVG_MARKUP_BYTES) return { ok: false, reason: "file_too_large" };

  for (const pattern of SVG_BLOCKED_PATTERNS) {
    if (pattern.test(svg)) return { ok: false, reason: "svg_blocked_content" };
  }

  let cleaned = svg
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(href|xlink:href)\s*=\s*("|\')\s*javascript:[^"\']*\2/gi, "")
    .replace(/\s(href|xlink:href)\s*=\s*("|\')\s*(?!#)[^"\']*\2/gi, "");

  if (!/<svg[\s>]/i.test(cleaned)) return { ok: false, reason: "invalid_svg" };
  for (const pattern of SVG_BLOCKED_PATTERNS) {
    if (pattern.test(cleaned)) return { ok: false, reason: "svg_blocked_content" };
  }

  const bytes = Buffer.from(cleaned, "utf-8");
  if (bytes.length > MAX_SVG_MARKUP_BYTES) return { ok: false, reason: "file_too_large" };
  return { ok: true, svg: cleaned, bytes };
}

export function validateSvgUpload(input: {
  dataUrl: string;
  slug: string;
}): ({ ok: true; svg: string; bytes: Buffer; storageKey: string } | { ok: false; reason: string }) {
  const decoded = decodeSvgDataUrl(input.dataUrl);
  if (!decoded) return { ok: false, reason: "invalid_data_url" };
  const sanitized = sanitizeSvgMarkup(decoded);
  if (!sanitized.ok) return sanitized;
  const safeSlug = input.slug.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  if (!safeSlug) return { ok: false, reason: "invalid_key" };
  return {
    ok: true,
    svg: sanitized.svg,
    bytes: sanitized.bytes,
    storageKey: `admin-icons/${safeSlug}-${Date.now()}.svg`,
  };
}
