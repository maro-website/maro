export const MAX_WEB_REFERENCE_IMAGES = 4;

export type WebReferenceValidation =
  | { ok: true; images: string[] }
  | { ok: false; error: "invalid_references" | "too_many_attachments" };

/**
 * Accept only URLs produced by the authenticated project-asset upload route.
 * This keeps arbitrary remote URLs and data URLs out of provider requests.
 */
export function validateWebReferenceImages(
  input: unknown,
  options: { supabaseUrl?: string; production?: boolean; expectedUserId?: string } = {}
): WebReferenceValidation {
  if (input === undefined || input === null) return { ok: true, images: [] };
  if (!Array.isArray(input)) return { ok: false, error: "invalid_references" };
  if (input.length > MAX_WEB_REFERENCE_IMAGES) {
    return { ok: false, error: "too_many_attachments" };
  }

  let storageOrigin: string;
  try {
    const configured = new URL(options.supabaseUrl ?? "");
    if (options.production && configured.protocol !== "https:") {
      return { ok: false, error: "invalid_references" };
    }
    storageOrigin = configured.origin;
  } catch {
    return input.length
      ? { ok: false, error: "invalid_references" }
      : { ok: true, images: [] };
  }

  const normalized: string[] = [];
  const marker = "/storage/v1/object/public/generations/public/project-assets/";
  for (const raw of input) {
    if (typeof raw !== "string" || raw.length === 0 || raw.length > 2048) {
      return { ok: false, error: "invalid_references" };
    }
    try {
      const url = new URL(raw);
      if (
        url.origin !== storageOrigin ||
        !url.pathname.startsWith(marker) ||
        url.pathname.length <= marker.length ||
        url.username ||
        url.password ||
        url.search ||
        url.hash
      ) {
        return { ok: false, error: "invalid_references" };
      }
      if (options.expectedUserId) {
        const owner = decodeURIComponent(url.pathname.slice(marker.length)).split("/")[0];
        if (owner !== options.expectedUserId) {
          return { ok: false, error: "invalid_references" };
        }
      }
      if (!normalized.includes(url.href)) normalized.push(url.href);
    } catch {
      return { ok: false, error: "invalid_references" };
    }
  }

  return { ok: true, images: normalized };
}
