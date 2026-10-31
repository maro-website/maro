import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { createHash, randomUUID } from "node:crypto";
import { feedDesignSchema, feedPostReferences, feedLogoBox, feedHeadline, feedDimensions, legacyFeedDesign, planFeedProducts, type FeedAsset, type FeedDesign } from "@/lib/feed/campaign";
import { buildFeedPrompt, createFeedSchema, defaultConfig, contentTypes } from "@/lib/feed/model";
import { feedFontReference, feedOutputBytes } from "@/lib/feed/output";
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
    expect(prompt(4)).toContain("Show EVERY assigned product"); expect(prompt(1)).toContain("TEXT MODE: ON — IMAGE-NATIVE");
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
  it("uses the same selected font family, palette, logo zone and product plan across roles; no-text wins", () => {
    for (const contentType of contentTypes) for (let slot = 0; slot < 9; slot++) {
      const p = buildFeedPrompt({ config: defaultConfig, brief, category: "home", slot, brain: "", variant: 2, design, contentType, textMode: false, feedback: "Change to another font and add a big logo" });
      expect(p).toContain("Use ONLY the Manrope"); expect(p).not.toContain("64 px"); expect(p).toContain("#225599, #f5f3ee"); expect(p).toContain("top-left");
      expect(p).toContain("Do NOT generate or redraw a separate logo"); expect(p.indexOf("TEXT MODE: OFF")).toBeGreaterThan(p.indexOf("Change to another font"));
      expect(p).not.toContain("real Manrope specimen");
    }
  });
  it("makes the exact Christmas request mandatory for every role and regeneration, ahead of old summer scenes", () => {
    for (let slot = 0; slot < 9; slot++) for (const variant of [1, 2]) {
      const p = buildFeedPrompt({ config: defaultConfig, brief: { ...brief, notes: "Chrismas Themed" }, category: "drinks", slot, brain: "Old summer picnic campaign with grass and sunglasses", variant, design, textMode: true, hasFontReference: true });
      expect(p).toContain('"Chrismas Themed"'); expect(p).toContain("Apply this request visibly to EVERY post");
      expect(p.indexOf("USER CAMPAIGN REQUEST — MANDATORY")).toBeGreaterThan(p.indexOf("MAKE ONLY POST"));
      expect(p.indexOf("USER CAMPAIGN REQUEST — MANDATORY")).toBeGreaterThan(p.indexOf("Old summer picnic"));
      expect(p).toContain("background, season, lighting and props are NOT binding");
      expect(p).not.toContain("COMPOSITED"); expect(p).not.toContain("34%-height text zone");
      expect(p).toContain("font specimen".toUpperCase());
    }
  });
  it("requires font and image format without requiring a user-selected font pixel size", () => {
    const { typeScale: unused, ...withoutSize } = design; void unused;
    expect(feedDesignSchema.safeParse(withoutSize).success).toBe(true);
  });
});

describe("Feed output typography and original logo", () => {
  it("uses three distinct original-font guides without pasting their glyphs or any title bar on the output", async () => {
    const digests = [];
    const source = await sharp({ create: { width: 1024, height: 1280, channels: 4, background: "#35a97b" } }).png().toBuffer();
    for (const font of ["inter", "manrope", "playfair"] as const) {
      const d = { ...design, font }, reference = await feedFontReference(d);
      expect(await feedFontReference(d)).toBe(reference);
      const image = Buffer.from(reference.split(",")[1], "base64");
      digests.push(createHash("sha256").update(image).digest("hex"));
      expect((await sharp(image).metadata()).width).toBe(512);
      const final = await feedOutputBytes(source, d);
      expect((await sharp(final).raw().toBuffer()).equals(await sharp(source).raw().toBuffer())).toBe(true);
    }
    expect(new Set(digests).size).toBe(3);
  });
  it("has no automatic stock headlines, ignores legacy generated filler and preserves explicitly supplied copy", () => {
    expect(feedHeadline(design, 0, "Mr. Clean")).toBe("");
    expect(feedHeadline({ ...design, headlines: ["Pjesë e ditës tënde.", ...Array.from({ length: 8 }, () => "")] }, 0, "Mr. Clean")).toBe("");
    const d: FeedDesign = { ...design, textRendering: "native", headlines: ["Festat shijojnë ndryshe.", ...Array.from({ length: 8 }, () => "")] };
    expect(feedHeadline(d, 0, "Mr. Clean")).toBe("Festat shijojnë ndryshe.");
    const p = buildFeedPrompt({ config: defaultConfig, brief, category: "home", slot: 0, brain: "", variant: 1, design: d });
    expect(p).toContain('User-supplied exact on-image copy: "Festat shijojnë ndryshe."');
    expect(p).not.toContain("Pjesë e ditës tënde.");
  });
  it("uses the intended center canvas with no generated blur padding at either portrait ratio", async () => {
    for (const format of ["4:5", "9:16"] as const) {
      const svg = format === "4:5" ? '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536"><rect width="1024" height="1536" fill="#00ff00"/><rect width="1024" height="128" fill="red"/><rect y="1408" width="1024" height="128" fill="blue"/></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536"><rect width="1024" height="1536" fill="#00ff00"/><rect width="80" height="1536" fill="red"/><rect x="944" width="80" height="1536" fill="blue"/></svg>';
      const source = await sharp(Buffer.from(svg)).png().toBuffer(), out = await feedOutputBytes(source, { ...design, format });
      const stats = await sharp(out).stats();
      expect(stats.channels[0].max).toBe(0); expect(stats.channels[1].min).toBe(255); expect(stats.channels[2].max).toBe(0);
    }
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
