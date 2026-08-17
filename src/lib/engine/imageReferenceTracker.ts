/**
 * Tracks actual maroImazh reference resolution during legacy production.
 * Safe metadata only — no base64 or full data URLs stored.
 */

import {
  IMAGE_PROVIDER_REF_LIMIT,
  type ImageReferenceResolution,
  type ImageReferenceSource,
  type SafeImageReferenceMeta,
} from "./imageCompile";

function parseDataUrlMime(value: string): string | undefined {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,/.exec(value);
  return m?.[1];
}

function safeRefIdentifier(value: string): string {
  if (value.startsWith("data:image/")) return "data-url";
  try {
    const u = new URL(value);
    return u.pathname.split("/").pop() || u.hostname;
  } catch {
    return "ref";
  }
}

export interface ImageReferenceTracker {
  recordAttempt(sourceType: ImageReferenceSource, raw: string, usable?: boolean): void;
  markUsable(raw: string): void;
  finalize(providerRefsUsed: number): ImageReferenceResolution;
  getAttempts(): SafeImageReferenceMeta[];
}

export function createImageReferenceTracker(): ImageReferenceTracker {
  const attempts: SafeImageReferenceMeta[] = [];
  let index = 0;

  return {
    recordAttempt(sourceType, raw, usable = raw.startsWith("data:image/")) {
      const trimmed = raw.trim();
      if (!trimmed) return;
      const identifier =
        trimmed.startsWith("data:image/") ? `data-url-${index}` : safeRefIdentifier(trimmed);
      if (attempts.some((a) => a.identifier === identifier && a.sourceType === sourceType)) return;
      attempts.push({
        index: index++,
        sourceType,
        mime: usable ? parseDataUrlMime(trimmed) : undefined,
        usable,
        includedInProviderRequest: false,
        identifier,
      });
    },
    markUsable(raw) {
      const trimmed = raw.trim();
      const item =
        attempts.find((a) => a.identifier === safeRefIdentifier(trimmed)) ??
        attempts.find((a) => !a.usable && (trimmed.startsWith("http") || trimmed.startsWith("data:image/")));
      if (item) {
        item.usable = true;
        if (trimmed.startsWith("data:image/")) item.mime = parseDataUrlMime(trimmed);
      }
    },
    finalize(providerRefsUsed) {
      const referenceCountReceived = attempts.length;
      const usableRefs = attempts.filter((r) => r.usable);
      const referenceCountUsable = usableRefs.length;
      const referenceCountUsed =
        providerRefsUsed > 0 ? Math.min(providerRefsUsed, IMAGE_PROVIDER_REF_LIMIT) : 0;
      const referencesRequested = referenceCountReceived > 0;
      const operation = referenceCountUsed > 0 ? "edit" : "generate";
      const fallbackFromEditToGenerate = referencesRequested && referenceCountUsable === 0;

      for (const ref of attempts) {
        ref.includedInProviderRequest =
          ref.usable && usableRefs.indexOf(ref) < referenceCountUsed;
      }

      return {
        referenceCountReceived,
        referenceCountUsable,
        referenceCountUsed,
        referenceLimit: IMAGE_PROVIDER_REF_LIMIT,
        operation,
        referencesRequested,
        fallbackFromEditToGenerate,
        references: attempts.map((r) => ({ ...r })),
      };
    },
    getAttempts() {
      return attempts.map((r) => ({ ...r }));
    },
  };
}

export function toSafeAttachmentMeta(
  attachments?: string[]
): Array<{ type: string; url?: string }> {
  return (attachments ?? []).map((a) => {
    if (typeof a !== "string") return { type: "unknown" };
    if (a.startsWith("data:image/")) {
      const mime = parseDataUrlMime(a) ?? "image";
      return { type: mime, url: "data-url" };
    }
    if (a.startsWith("http")) return { type: "image", url: a };
    return { type: "unknown" };
  });
}
