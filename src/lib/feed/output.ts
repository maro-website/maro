import "server-only";
import sharp from "sharp";
import { feedDimensions, type FeedDesign } from "./campaign";
import { feedLogoLayers } from "./logo";

export async function feedPalette(images: string[]) {
  const colors: string[] = [];
  for (const image of images) {
    const { dominant } = await sharp(Buffer.from(image.split(",")[1], "base64"), { limitInputPixels: 40_000_000 }).resize(64, 64, { fit: "inside" }).stats();
    const color = "#" + [dominant.r, dominant.g, dominant.b].map(v => v.toString(16).padStart(2, "0")).join("");
    if (!colors.includes(color)) colors.push(color);
    if (colors.length === 3) break;
  }
  return [...colors, "#f5f3ee", "#202522"].slice(0, 5);
}

/** Preserve the provider's integrated artwork and lettering; composite only the original logo. */
export async function feedOutputBytes(bytes: Buffer, design: FeedDesign, logo?: string) {
  const { width, height } = feedDimensions(design.format);
  const framed = await sharp(bytes, { limitInputPixels: 40_000_000 }).rotate().resize(width, height, { fit: "cover", position: "centre" }).png().toBuffer();
  if (!logo) return framed;
  const mark = await feedLogoLayers(framed, logo, design);
  return sharp(framed).composite(mark.layers).png().toBuffer();
}
