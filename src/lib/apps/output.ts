import "server-only";
import sharp from "sharp";
import type { AppBrief } from "./model";
export async function appOutputBytes(bytes: Buffer, format: AppBrief["format"]) {
  return sharp(bytes, { limitInputPixels: 40_000_000 }).resize(format === "9:16" ? 864 : 1024, format === "9:16" ? 1536 : format === "4:5" ? 1280 : 1024, { fit: "cover", position: "centre" }).png().toBuffer();
}
