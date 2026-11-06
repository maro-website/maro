import "server-only";
import sharp from "sharp";
import type { NativeImageFormat } from "@/lib/ai/image26";
import { MAX_GENERATED_IMAGE_BYTES, MAX_SVG_MARKUP_BYTES, sanitizeSvgMarkup } from "@/lib/security/uploadValidation";

export async function nativeImageOutput(base64: string, format: NativeImageFormat) {
  const byteLimit = format === "svg" ? MAX_SVG_MARKUP_BYTES : MAX_GENERATED_IMAGE_BYTES;
  if (base64.length > Math.ceil(byteLimit / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new Error("invalid_native_image");
  const original = Buffer.from(base64, "base64");
  if (original.length > byteLimit) throw new Error("invalid_native_image");

  if (format === "svg") {
    const safe = sanitizeSvgMarkup(new TextDecoder("utf-8", { fatal: true }).decode(original));
    if (!safe.ok || /@import|@font-face|url\(\s*["']?\s*(?!#)[^)]/i.test(safe.svg) ||
        /(?:href|src)\s*=\s*(?:"(?!#)|'(?!#)|[^\s"'])/i.test(safe.svg) ||
        /<(?:[\w.-]+:)?(?:image|feImage|a|animate\w*|set)\b/i.test(safe.svg)) throw new Error("invalid_native_image");
    const poster = await sharp(safe.bytes, { limitInputPixels: 16_000_000 })
      .resize({ width: 1024, height: 1024, fit: "inside" }).png().toBuffer();
    return { original: safe.bytes, poster, contentType: "image/svg+xml" };
  }

  const image = sharp(original, { animated: true, limitInputPixels: 16_000_000 });
  const { format: detected, pages, width, pageHeight } = await image.metadata();
  if (detected !== "gif" || !pages || pages < 2 || pages > 16 || !width || !pageHeight || width * pageHeight * pages > 16_000_000) {
    throw new Error("invalid_native_image");
  }
  await image.raw().toBuffer(); // Decode every frame before checkpointing a successful output.
  const poster = await sharp(original, { limitInputPixels: 16_000_000 }).png().toBuffer();
  return { original, poster, contentType: "image/gif" };
}
