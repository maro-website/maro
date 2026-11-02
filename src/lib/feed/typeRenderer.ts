import "server-only";
import sharp from "sharp";
import path from "node:path";
import { readFileSync } from "node:fs";
import { create, type Font } from "fontkit";
import { feedFonts, feedFontPixels, feedTextBox, type FeedDesign } from "./campaign";
import type { FeedPlanPost } from "./plan";
import { balanceFeedLines, feedTypeSetting } from "./typography";

const files = { inter: "@fontsource/inter/files/inter-latin-700-normal.woff", manrope: "@fontsource/manrope/files/manrope-latin-700-normal.woff", playfair: "@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff" } as const;
const fonts = new Map<NonNullable<FeedDesign["font"]>, Font>();
type Bounds = { width: number; height: number; size: number; maxLines?: number; align?: "left" | "center"; tracking?: number; leading?: number };
/** Exact bundled outlines, balanced words, tight leading and real ink bounds; no system-font fallback. */
export async function feedTextImage(text: string, design: FeedDesign, color = "#ffffff", bounds?: Bounds) {
  const fontKey = design.font ?? "inter";
  let font = fonts.get(fontKey);
  if (!font) { font = create(readFileSync(path.join(process.cwd(), "node_modules", files[fontKey]))); if (font.familyName !== feedFonts[fontKey]) throw new Error("feed_font_unavailable"); fonts.set(fontKey, font); }
  const value = text.normalize("NFC").replace(/[^\S\n]+/g, " ").trim();
  if (!value || [...value].some(c => c !== "\n" && !font!.hasGlyphForCodePoint(c.codePointAt(0)!))) throw new Error("headline_unsupported");
  if (!/^#[a-f\d]{6}$/i.test(color)) throw new Error("invalid_text_color");
  const box = bounds ?? feedTextBox(design), maxLines = bounds?.maxLines ?? 8;
  let size = bounds?.size ?? Math.round(feedFontPixels(design.typeScale) * (design.format === "9:16" ? 864 / 1024 : 1));
  let scale = size / font.unitsPerEm, lines: string[] | null = null, height = 0, topInk = 0, lineHeight = 0;
  const tracking = bounds?.tracking ?? 0, inset = 4;
  const measure = (line: string) => { const run = font!.layout(line); return run.positions.reduce((n, p) => n + p.xAdvance * scale, 0) + Math.max(0, run.glyphs.length - 1) * size * tracking; };
  while (size >= 32) {
    scale = size / font.unitsPerEm;
    lines = balanceFeedLines(value, box.width - inset * 2, measure, maxLines);
    if (lines) {
      const glyphs = lines.flatMap(line => font!.layout(line).glyphs).filter(glyph => Number.isFinite(glyph.bbox.maxY) && Number.isFinite(glyph.bbox.minY));
      topInk = Math.max(0, ...glyphs.map(glyph => glyph.bbox.maxY)) * scale;
      const bottomInk = Math.min(0, ...glyphs.map(glyph => glyph.bbox.minY)) * scale;
      lineHeight = Math.ceil(size * (bounds?.leading ?? 1.12));
      height = Math.ceil(topInk - bottomInk + (lines.length - 1) * lineHeight + inset * 2);
      if (height <= box.height) break;
    }
    size -= 2; lines = null;
  }
  if (!lines || height > box.height) throw new Error("headline_too_long");
  const paths: string[] = [];
  lines.forEach((line, row) => {
    const run = font!.layout(line); let cursor = inset + (bounds?.align === "center" ? (box.width - inset * 2 - measure(line)) / 2 : 0);
    run.glyphs.forEach((glyph, index) => {
      const position = run.positions[index], x = cursor + position.xOffset * scale, y = inset + topInk + row * lineHeight - position.yOffset * scale;
      paths.push(`<path d="${glyph.path.toSVG()}" transform="translate(${x} ${y}) scale(${scale} ${-scale})"/>`);
      cursor += position.xAdvance * scale + size * tracking;
    });
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${box.width}" height="${height}"><g fill="${color}">${paths.join("")}</g></svg>`;
  return { ...await sharp(Buffer.from(svg)).png().toBuffer({ resolveWithObject: true }), lines, fontSize: size };
}

export function feedPlannedText(text: string, design: FeedDesign, post: Pick<FeedPlanPost, "layout">, color = "#ffffff") {
  return feedTextImage(text, design, color, feedTypeSetting(design, post.layout));
}
