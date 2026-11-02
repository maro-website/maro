import { z } from "zod";
import { MAX_COMPOSER_ATTACHMENTS } from "@/lib/config/attachments";

export const feedFonts = { inter: "Inter", manrope: "Manrope", playfair: "Playfair Display" } as const;
export const feedFormats = { "1:1": "1:1 · 1024 × 1024", "4:5": "4:5 · 1024 × 1280", "9:16": "9:16 · 864 × 1536" } as const;
export const feedLogoPositions = { "top-left": "Lart majtas", "top-right": "Lart djathtas", "bottom-left": "Poshtë majtas", "bottom-right": "Poshtë djathtas" } as const;
export type FeedAsset = { index: number; role: "product" | "logo" | "style"; label: string };
export const feedDesignSchema = z.object({
  // Accept legacy saved settings; generation no longer uses a fixed font.
  version: z.literal(1), font: z.enum(["inter", "manrope", "playfair"]).optional(),
  name: z.string().trim().max(100).optional(),
  headlines: z.array(z.string().trim().max(60)).length(9).optional(),
  textRendering: z.literal("native").optional(),
  format: z.enum(["1:1", "4:5", "9:16"]), typeScale: z.enum(["small", "medium", "large"]).default("medium"),
  logoPosition: z.enum(["top-left", "top-right", "bottom-left", "bottom-right"]),
  assets: z.array(z.object({ index: z.number().int().min(0).max(MAX_COMPOSER_ATTACHMENTS - 1), role: z.enum(["product", "logo", "style"]), label: z.string().trim().min(1).max(100) }).strict()).min(1).max(MAX_COMPOSER_ATTACHMENTS),
  assignments: z.array(z.array(z.number().int().min(0).max(MAX_COMPOSER_ATTACHMENTS - 1)).min(1).max(MAX_COMPOSER_ATTACHMENTS)).length(9),
  palette: z.array(z.string().regex(/^#[0-9a-f]{6}$/i)).max(5).optional(),
}).strict().superRefine((design, ctx) => {
  const indices = design.assets.map(a => a.index);
  const products = design.assets.filter(a => a.role === "product").map(a => a.index);
  if (new Set(indices).size !== indices.length || indices.some(i => i >= indices.length)) ctx.addIssue({ code: "custom", path: ["assets"], message: "invalid_reference_map" });
  if (!products.length || design.assets.filter(a => a.role === "logo").length > 1) ctx.addIssue({ code: "custom", path: ["assets"], message: "select_products_and_one_logo" });
  if (design.assignments.some(row => new Set(row).size !== row.length || row.some(i => !products.includes(i))) || products.some(i => !design.assignments.some(row => row.includes(i)))) ctx.addIssue({ code: "custom", path: ["assignments"], message: "every_product_must_appear" });
});
export type FeedDesign = z.infer<typeof feedDesignSchema>;

/** Balance individual products, with collection shots at the campaign's center and close. */
export function planFeedProducts(assets: FeedAsset[]): number[][] {
  const products = assets.filter(a => a.role === "product").map(a => a.index);
  if (!products.length) return Array.from({ length: 9 }, () => []);
  let solo = 0;
  return Array.from({ length: 9 }, (_, slot) => products.length > 1 && (slot === 8 || (slot === 4 && products.length <= 7)) ? [...products] : [products[solo++ % products.length]]);
}

/** Original assets only. A completed campaign post is never an input to another. */
export function feedPostReferences(design: FeedDesign, slot: number) {
  if (!Number.isInteger(slot) || slot < 0 || slot > 8) throw new Error("invalid_slot");
  return [...design.assignments[slot], ...design.assets.filter(a => a.role === "style").map(a => a.index)];
}

export function legacyFeedDesign(count: number): FeedDesign {
  const assets: FeedAsset[] = Array.from({ length: count }, (_, index) => ({ index, role: "product", label: `Produkti ${index + 1}` }));
  return { version: 1, format: "1:1", typeScale: "medium", logoPosition: "bottom-right", assets, assignments: planFeedProducts(assets) };
}

export function feedDimensions(format: FeedDesign["format"]) {
  return { width: format === "9:16" ? 864 : 1024, height: format === "9:16" ? 1536 : format === "4:5" ? 1280 : 1024 };
}
export const feedFontPixels = (scale: FeedDesign["typeScale"]) => ({ small: 48, medium: 64, large: 80 })[scale];
export function feedHeadline(design: FeedDesign, slot: number, brand: string) {
  const custom = design.headlines?.[slot]?.trim();
  if (!custom) return "";
  // Old feeds stored automatic filler as if it were user copy. Do not carry it into new renders.
  if (!design.textRendering && [brand, `Zbulo ${brand}.`, `Discover ${brand}.`, "Pjesë e ditës tënde.", "Detajet bëjnë dallimin.", "Zgjedhja jote e radhës.", "Në ritmin tënd.", "Një ndjesi tjetër.", "Cilin zgjedh ti?", "Zbulo diçka të re.", "Part of your everyday.", "It's in the details.", "Your next discovery.", "Find your rhythm.", "A different feeling.", "Which one is yours?", "Discover something new."].includes(custom)) return "";
  return custom;
}
export function feedTextBox(design: Pick<FeedDesign, "format" | "logoPosition">) {
  const { width, height } = feedDimensions(design.format);
  const w = Math.round(width * .84), h = Math.round(height * .34), margin = Math.round(width * .08);
  return { width: w, height: h, left: margin, top: design.logoPosition.startsWith("top") ? height - margin - h : margin };
}
export function feedLogoBox(design: Pick<FeedDesign, "format" | "logoPosition">) {
  const { width, height } = feedDimensions(design.format);
  const w = Math.round(width * .18), h = Math.round(width * .08), margin = Math.round(width * .05);
  return { width: w, height: h, left: design.logoPosition.endsWith("left") ? margin : width - margin - w, top: design.logoPosition.startsWith("top") ? margin : height - margin - h };
}
