import "server-only";
import sharp from "sharp";
import type { AppBrief } from "./model";
export async function appOutputBytes(bytes: Buffer, format: AppBrief["format"]) {
  const width = format === "9:16" ? 864 : 1024;
  const height = format === "9:16" ? 1536 : format === "4:5" ? 1280 : 1024;
  // Provider canvas sizes differ from our ad formats. Preserve the complete ad:
  // cover would permanently cut headlines, app icons and CTAs off the stored PNG.
  const foreground = await sharp(bytes, { limitInputPixels: 40_000_000 }).rotate()
    .resize(width, height, { fit: "inside" }).png().toBuffer({ resolveWithObject: true });
  if (foreground.info.width === width && foreground.info.height === height) return foreground.data;
  // Only the decorative backdrop may be cropped; the sharp foreground stays whole.
  return sharp(bytes, { limitInputPixels: 40_000_000 }).rotate()
    .resize(width, height, { fit: "cover", position: "centre" }).blur(64)
    .composite([{ input: foreground.data, left: Math.floor((width - foreground.info.width) / 2), top: Math.floor((height - foreground.info.height) / 2) }])
    .png().toBuffer();
}
