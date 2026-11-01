import "server-only";
import sharp from "sharp";
import { feedDimensions, type FeedDesign } from "./campaign";
import { feedTextImage, feedPlannedText } from "./typeRenderer";
import { feedLogoLayers } from "./logo";
export { feedTextImage, feedPlannedText };

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

const specimens = new Map<FeedDesign["font"], Promise<string>>();
/** A small original-font guide for image-native typography. It is never pasted onto the output. */
export function feedFontReference(design: FeedDesign, headline?: string) {
  if (headline?.trim()) return (async () => {
    const text = await feedTextImage(headline.replace(/\s+/g, " ").trim(), design, "#202522", { width: 4096, height: 180, size: 80, maxLines: 1 });
    const ink = await sharp(text.data).trim().png().toBuffer();
    const padded = await sharp(ink).flatten({ background: "#ffffff" }).extend({ top: 24, bottom: 24, left: 24, right: 24, background: "#ffffff" }).png().toBuffer();
    const sample = await sharp(padded).resize({ width: 1024, height: 256, fit: "inside", withoutEnlargement: true }).png().toBuffer();
    return `data:image/png;base64,${sample.toString("base64")}`;
  })();
  if (!specimens.has(design.font)) specimens.set(design.font, (async () => {
    const text = await feedTextImage("Aa Bb Ee Ëë Çç 0123", { ...design, format: "1:1", typeScale: "medium" }, "#202522");
    const specimen = await sharp({ create: { width: 900, height: text.info.height + 48, channels: 4, background: "#ffffff" } }).composite([{ input: text.data, left: 20, top: 24 }]).png().toBuffer();
    const png = await sharp(specimen).resize({ width: 512 }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  })().catch(error => { specimens.delete(design.font); throw error; }));
  return specimens.get(design.font)!;
}

/** Preserve the provider's integrated artwork and lettering; composite only the original logo. */
export async function feedOutputBytes(bytes: Buffer, design: FeedDesign, logo?: string) {
  const { width, height } = feedDimensions(design.format);
  const framed = await sharp(bytes, { limitInputPixels: 40_000_000 }).rotate().resize(width, height, { fit: "cover", position: "centre" }).png().toBuffer();
  if (!logo) return framed;
  const mark = await feedLogoLayers(framed, logo, design);
  return sharp(framed).composite(mark.layers).png().toBuffer();
}
