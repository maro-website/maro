import "server-only";
import sharp from "sharp";
import path from "node:path";
import { readFileSync } from "node:fs";
import { create, type Font } from "fontkit";
import { appOutputBytes } from "@/lib/apps/output";
import { feedFonts, feedFontPixels, feedLogoBox, feedTextBox, type FeedDesign } from "./campaign";

const fontFiles = { inter: "@fontsource/inter/files/inter-latin-700-normal.woff", manrope: "@fontsource/manrope/files/manrope-latin-700-normal.woff", playfair: "@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff" } as const;
const fonts = new Map<FeedDesign["font"], Font>();
/** Rasterize the bundled glyph outlines directly; system font availability cannot change the face. */
export async function feedTextImage(text: string, design: FeedDesign, color = "#ffffff") {
  const box = feedTextBox(design), size = Math.round(feedFontPixels(design.typeScale) * (design.format === "9:16" ? 864 / 1024 : 1));
  let font = fonts.get(design.font);
  if (!font) {
    font = create(readFileSync(path.join(process.cwd(), "node_modules", fontFiles[design.font])));
    if (font.familyName !== feedFonts[design.font]) throw new Error("feed_font_unavailable");
    fonts.set(design.font, font);
  }
  const normalized = text.normalize("NFC").replace(/\s+/gu, " ").trim();
  if (!normalized || [...normalized].some(c => !font.hasGlyphForCodePoint(c.codePointAt(0)!))) throw new Error("headline_unsupported");
  if (!/^#[a-f\d]{6}$/i.test(color)) throw new Error("invalid_text_color");
  const scale = size / font.unitsPerEm;
  const width = (value: string) => font.layout(value).positions.reduce((n, p) => n + p.xAdvance * scale, 0);
  const lines: string[] = []; let current = "";
  for (const word of normalized.split(" ")) {
    if (current && width(current + " " + word) <= box.width) { current += " " + word; continue; }
    if (current) { lines.push(current); current = ""; }
    for (const character of word) {
      if (current && width(current + character) > box.width) { lines.push(current); current = ""; }
      current += character;
    }
  }
  if (current) lines.push(current);
  const lineHeight = Math.ceil((font.ascent - font.descent + font.lineGap) * scale);
  const height = lines.length * lineHeight;
  if (height > box.height) throw new Error("headline_too_long");
  const paths: string[] = [];
  lines.forEach((line, lineIndex) => {
    const run = font.layout(line); let cursor = 0;
    run.glyphs.forEach((glyph, index) => {
      const position = run.positions[index], x = cursor + position.xOffset * scale;
      const y = font!.ascent * scale + lineIndex * lineHeight - position.yOffset * scale;
      paths.push(`<path d="${glyph.path.toSVG()}" transform="translate(${x} ${y}) scale(${scale} ${-scale})"/>`);
      cursor += position.xAdvance * scale;
    });
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${box.width}" height="${height}" viewBox="0 0 ${box.width} ${height}"><g fill="${color}">${paths.join("")}</g></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer({ resolveWithObject: true });
}

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

/** Preserve the full render, then compose exact typography and the unmodified original logo. */
export async function feedOutputBytes(bytes: Buffer, design: FeedDesign, logo?: string, headline?: string) {
  let framed = await appOutputBytes(bytes, design.format);
  if (headline) {
    const box = feedTextBox(design);
    const { dominant } = await sharp(framed).extract(box).resize(8, 8).stats();
    const light = .2126 * dominant.r + .7152 * dominant.g + .0722 * dominant.b > 150;
    const text = await feedTextImage(headline, design, light ? "#161b18" : "#ffffff");
    const plate = await sharp({ create: { width: box.width + 24, height: text.info.height + 24, channels: 4, background: light ? { r: 255, g: 255, b: 255, alpha: .88 } : { r: 20, g: 25, b: 22, alpha: .88 } } }).png().toBuffer();
    framed = await sharp(framed).composite([{ input: plate, left: box.left - 12, top: box.top - 12 }, { input: text.data, left: box.left, top: box.top }]).png().toBuffer();
  }
  if (!logo) return framed;
  const box = feedLogoBox(design);
  const overlay = await sharp(Buffer.from(logo.split(",")[1], "base64"), { limitInputPixels: 40_000_000 }).rotate().resize(box.width, box.height, { fit: "contain", background: "#00000000" }).png().toBuffer();
  return sharp(framed).composite([{ input: overlay, left: box.left, top: box.top }]).png().toBuffer();
}
