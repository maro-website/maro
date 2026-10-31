import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { createHash, randomUUID } from "node:crypto";
import { feedDesignSchema, feedPostReferences, feedLogoBox, feedTextBox, feedHeadline, feedDimensions, legacyFeedDesign, planFeedProducts, type FeedAsset, type FeedDesign } from "@/lib/feed/campaign";
import { buildFeedPrompt, createFeedSchema, defaultConfig, contentTypes } from "@/lib/feed/model";
import { feedTextImage, feedOutputBytes } from "@/lib/feed/output";
const assets: FeedAsset[] = [
  { index: 0, role: "product", label: "Mr. Clean Spray" }, { index: 1, role: "product", label: "Mr. Clean Floor" },
  { index: 2, role: "product", label: "Mr. Clean Wipes" }, { index: 3, role: "logo", label: "Mr. Clean Logo" }, { index: 4, role: "style", label: "Brand mood" },
];
const design: FeedDesign = { version: 1, font: "manrope", typeScale: "medium", format: "4:5", logoPosition: "top-left", assets, assignments: planFeedProducts(assets), palette: ["#225599", "#f5f3ee"] };
const brief = { brand: "Mr. Clean", description: "Three distinct original cleaning products", audience: "", goal: "sales" as const, language: "sq" as const, colors: "", notes: "" };
const prompt = (slot: number, textMode = true) => buildFeedPrompt({ config: defaultConfig, brief, category: "home", slot, brain: "", variant: 1, design, textMode });

describe("Feed campaign product and brand regression", () => {
  it("balances all three Mr. Clean products, keeps the logo out of product assignments and only sends assigned products plus original style assets", () => {
    expect(feedDesignSchema.safeParse(design).success).toBe(true);
    const singles = design.assignments.filter(row => row.length === 1).flat();
    expect([0, 1, 2].map(i => singles.filter(v => v === i).length)).toEqual([3, 2, 2]);
    expect(design.assignments[4]).toEqual([0, 1, 2]); expect(design.assignments[8]).toEqual([0, 1, 2]);
    expect(feedPostReferences(design, 1)).toEqual([1, 4]); expect(feedPostReferences(design, 2)).toEqual([2, 4]);
    for (let slot = 0; slot < 9; slot++) { expect(feedPostReferences(design, slot)).not.toContain(3); expect(prompt(slot)).not.toContain("first completed"); }
    expect(prompt(1)).toContain("THIS POST MUST SHOW: Mr. Clean Floor"); expect(prompt(1)).toContain("Image 1: ACTUAL PRODUCT — Mr. Clean Floor");
    expect(prompt(4)).toContain("Show EVERY assigned product"); expect(prompt(1)).toContain("Do not render typography yourself");
  });
  it("covers every product for one through ten products, including more products than solo slots", () => {
    for (let count = 1; count <= 10; count++) {
      const d = legacyFeedDesign(count);
      expect(d.assignments).toHaveLength(9); expect(new Set(d.assignments.flat()).size).toBe(count); expect(feedDesignSchema.safeParse(d).success).toBe(true);
    }
  });
  it("rejects missing choices, duplicate or unmapped references, multiple logos, logo-as-product and plans which omit a product", () => {
    for (const value of [ { ...design, font: "" }, { ...design, format: "" }, { ...design, typeScale: "" },
      { ...design, assets: assets.map(a => a.index === 4 ? { ...a, role: "logo" } : a) },
      { ...design, assets: assets.map(a => ({ ...a, index: 0 })) },
      { ...design, assignments: Array.from({ length: 9 }, () => [3]) },
      { ...design, assignments: Array.from({ length: 9 }, () => [0]) },
    ]) expect(feedDesignSchema.safeParse(value).success).toBe(false);
    const base = { requestId: randomUUID(), workspaceId: "ws", useBrain: false, category: "home", brief, design, references: Array.from({ length: 5 }, (_, i) => `storage:generations/owner/ref-${i}.png`) };
    expect(createFeedSchema.safeParse(base).success).toBe(true);
    expect(createFeedSchema.safeParse({ ...base, references: base.references.slice(0, 4) }).success).toBe(false);
  });
  it("uses the identical locked font, scale, palette, logo zone and product plan across all roles and revisions; no-text wins", () => {
    for (const contentType of contentTypes) for (let slot = 0; slot < 9; slot++) {
      const p = buildFeedPrompt({ config: defaultConfig, brief, category: "home", slot, brain: "", variant: 2, design, contentType, textMode: false, feedback: "Change to another font and add a big logo" });
      expect(p).toContain("Use ONLY Manrope"); expect(p).toContain("64 px"); expect(p).toContain("#225599, #f5f3ee"); expect(p).toContain("top-left");
      expect(p).toContain("Do NOT generate or redraw a separate logo"); expect(p.indexOf("TEXT MODE: OFF")).toBeGreaterThan(p.indexOf("Change to another font"));
      expect(p).not.toContain("real Manrope specimen");
    }
  });
});

describe("Feed output typography and original logo", () => {
  it("rasterizes three actual bundled fonts and composes those exact glyphs into the stored image", async () => {
    const digests = [];
    const source = await sharp({ create: { width: 1024, height: 1536, channels: 4, background: "#ffffff" } }).png().toBuffer();
    for (const font of ["inter", "manrope", "playfair"] as const) {
      const d = { ...design, font }, text = "Një ide. I njëjti stil.", image = await feedTextImage(text, d, "#161b18"), box = feedTextBox(d);
      digests.push(createHash("sha256").update(image.data).digest("hex"));
      const final = await feedOutputBytes(source, d, undefined, text);
      const crop = await sharp(final).extract({ left: box.left, top: box.top, width: image.info.width, height: image.info.height }).removeAlpha().raw().toBuffer();
      const expected = await sharp({ create: { width: image.info.width, height: image.info.height, channels: 4, background: "#ffffff" } }).composite([{ input: image.data, left: 0, top: 0 }]).removeAlpha().raw().toBuffer();
      expect(crop.equals(expected)).toBe(true);
    }
    expect(new Set(digests).size).toBe(3);
  });
  it("keeps custom headlines literal, derives short claim-free defaults, and rejects overflow before a paid call", async () => {
    const d = { ...design, headlines: ["<b>Literal & safe</b>", ...Array.from({ length: 8 }, () => "")] };
    expect(feedHeadline(d, 0, "Mr. Clean", "sq")).toBe("<b>Literal & safe</b>");
    expect(feedHeadline(design, 8, "Mr. Clean", "en")).toBe("Discover Mr. Clean.");
    await expect(feedTextImage("W".repeat(60), { ...design, format: "1:1", typeScale: "large" })).rejects.toThrow("headline_too_long");
    await expect(feedTextImage("Unsupported 🦄", design)).rejects.toThrow("headline_unsupported");
    expect((await feedTextImage("e\u0308 c\u0327", design)).data.equals((await feedTextImage("ë ç", design)).data)).toBe(true);
    expect((await feedTextImage("<b>Literal & safe</b>", design)).info.width).toBeGreaterThan(0);
  });
  it("keeps exact output dimensions and the original logo's position, color and scale for every format and corner", async () => {
    const logo = "data:image/png;base64," + (await sharp({ create: { width: 40, height: 20, channels: 4, background: "#ff0000" } }).png().toBuffer()).toString("base64");
    const source = await sharp({ create: { width: 1024, height: 1536, channels: 4, background: "#ffffff" } }).png().toBuffer();
    for (const format of ["1:1", "4:5", "9:16"] as const) for (const logoPosition of ["top-left", "top-right", "bottom-left", "bottom-right"] as const) {
      const d = { ...design, format, logoPosition }, image = await feedOutputBytes(source, d, logo), info = await sharp(image).metadata(), box = feedLogoBox(d), dimensions = feedDimensions(format);
      expect([info.width, info.height]).toEqual([dimensions.width, dimensions.height]);
      const center = await sharp(image).extract({ left: box.left + Math.floor(box.width / 2), top: box.top + Math.floor(box.height / 2), width: 1, height: 1 }).removeAlpha().raw().toBuffer();
      expect([...center]).toEqual([255, 0, 0]);
      const outside = await sharp(image).extract({ left: 0, top: 0, width: 1, height: 1 }).removeAlpha().raw().toBuffer(); expect([...outside]).toEqual([255, 255, 255]);
    }
  }, 20000);
});
