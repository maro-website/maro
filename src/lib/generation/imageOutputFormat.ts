import "server-only";
import sharp from "sharp";

/** Preserve normal output bytes; only the explicitly selected 4:3 format is framed. */
export async function imageOutputBytes(bytes: Buffer, format?: string) {
  const image = sharp(bytes, { limitInputPixels: 40_000_000 });
  if (format !== "4:3") return image.png().toBuffer();
  const { width, height } = await image.metadata();
  if (!width || !height) throw new Error("invalid_dimensions");
  const targetWidth = Math.floor(Math.min(width, height * 4 / 3) / 4) * 4;
  const targetHeight = targetWidth * 3 / 4;
  if (targetWidth < 4) throw new Error("invalid_dimensions");
  return image.extract({ width: targetWidth, height: targetHeight, left: Math.floor((width - targetWidth) / 2), top: Math.floor((height - targetHeight) / 2) }).png().toBuffer();
}
