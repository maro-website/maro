import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { feedDimensions, feedLogoBox, legacyFeedDesign, type FeedDesign } from "@/lib/feed/campaign";
import { defaultConfig, buildFeedPrompt, type FeedBrief } from "@/lib/feed/model";
import { feedCampaignPlanSchema, feedPostLayout, feedTypographyBox, validateFeedPlan } from "@/lib/feed/plan";
import { feedOutputBytes, feedPlannedText } from "@/lib/feed/output";
import { feedPlanFixture } from "./helpers/feedPlanFixture";
const design = legacyFeedDesign(3);
const brief: FeedBrief = { brand: "Brand", description: "Three original products", notes: "Christmas themed", audience: "", colors: "", goal: "sales", language: "sq" };
const generated = (d = design) => { const { version: unused, optimizer: ignored, ...plan } = feedPlanFixture(d); void unused; void ignored; return plan; };
describe("one shared Feed art direction", () => {
  it("locks all nine distinct roles, concepts, cameras and original assignments and honors no-text", () => {
    const plan = validateFeedPlan(generated(), design, brief, "", "mix", true);
    expect(plan.posts.map(post => post.layout)).toHaveLength(9);
    expect(new Set(plan.posts.map(post => post.layout)).size).toBe(9);
    expect(validateFeedPlan(generated(), design, brief, "", "mix", false).posts.every(post => post.headline === "")).toBe(true);
    for (const type of ["hero", "detail", "conversion"] as const) {
      const value = generated(); value.posts.forEach(post => { post.layout = feedPostLayout(post.slot, type); });
      expect(validateFeedPlan(value, design, brief, "", type, true).posts).toHaveLength(9);
    }
  });
  it("rejects repeated compositions and substituted original references", () => {
    for (const alter of [
      (plan: ReturnType<typeof generated>) => { plan.posts[1].concept = plan.posts[0].concept; },
      (plan: ReturnType<typeof generated>) => { plan.posts[0].subjects[0].reference = 2; },
    ]) { const plan = generated(); alter(plan); expect(() => validateFeedPlan(plan, design, brief, "", "mix", true)).toThrow(); }
  });
  it("normalizes server-owned layouts, single-product aliases and camera variety without another paid call", () => {
    const value = generated(); value.posts.reverse(); value.posts.forEach(post => { post.camera = "front"; post.layout = "lifestyle"; });
    value.posts.find(post => post.slot === 0)!.subjects[0].product = "Mistyped product alias";
    const plan = validateFeedPlan(value, design, brief, "", "mix", true);
    expect(plan.posts[0].subjects[0].product).toBe(design.assets[0].label); expect(plan.posts[2].layout).toBe("macro");
    expect(new Set(plan.posts.map(post => post.camera)).size).toBeGreaterThanOrEqual(4);
  });
  it("completes missing collection subjects from every assigned original without inventing or substituting references", () => {
    const value = generated(); value.posts[8].subjects = [value.posts[8].subjects[0]];
    const repaired = validateFeedPlan(value, design, brief, "", "mix", true);
    expect(repaired.posts[8].subjects.map(subject => subject.reference)).toEqual(design.assignments[8]);
    for (const subject of repaired.posts[8].subjects) expect(repaired.sources.find(source => source.index === subject.reference)?.products.some(product => product.name === subject.product)).toBe(true);
    const foreign = generated(); foreign.posts[0].subjects[0].reference = 2;
    expect(() => validateFeedPlan(foreign, design, brief, "", "mix", true)).toThrow("feed_plan_subjects");
    const duplicate = generated(); duplicate.posts[8].subjects.push({ ...duplicate.posts[8].subjects[0] });
    expect(() => validateFeedPlan(duplicate, design, brief, "", "mix", true)).toThrow("feed_plan_subjects");
  });
  it("keeps repaired multi-collection posts within the durable schema while retaining every assigned original", () => {
    const value = generated();
    for (const [index, count] of [[0, 12], [1, 4]]) for (let i = 1; i < count; i++) value.sources[index].products.push({ name: `Visible variant ${index}-${i}`, identity: "A distinct original package visibly present in this source" });
    value.posts[8].subjects = value.sources.slice(0, 2).flatMap(source => source.products.map(product => ({ reference: source.index, product: product.name })));
    const repaired = validateFeedPlan(value, design, brief, "", "mix", true);
    expect(repaired.posts[8].subjects).toHaveLength(16);
    expect(design.assignments[8].every(reference => repaired.posts[8].subjects.some(subject => subject.reference === reference))).toBe(true);
    expect(feedCampaignPlanSchema.safeParse({ ...repaired, version: "maro-feed-plan/1", optimizer: feedPlanFixture(design).optimizer }).success).toBe(true);
  });
  it("recognizes a multi-product source as a collection and requires variant coverage across its slots", () => {
    const d = legacyFeedDesign(1), value = generated(d), source = value.sources[0];
    source.kind = "collection"; source.products.push({ name: "Other visible variant", identity: "Original blue package with exact printed label" });
    const balanced = validateFeedPlan(value, d, brief, "", "mix", true);
    expect(new Set(balanced.posts.flatMap(post => post.subjects.map(subject => subject.product))).size).toBe(2);
    value.posts[1].subjects[0].product = "Other visible variant";
    expect(validateFeedPlan(value, d, brief, "", "mix", true).sources[0].kind).toBe("collection");
  });
  it("removes unsupported mini/fiber/numerical copy instead of discarding nine valid visuals, preserving verified and explicit copy", () => {
    for (const headline of ["Më shumë fibra.", "Në format mini.", "50% më lirë."]) {
      const value = generated(); value.posts[3].headline = headline;
      expect(validateFeedPlan(value, design, brief, "", "mix", true).posts[3].headline).toBe("");
    }
    const value = generated(); value.posts[3].headline = "Më shumë fibra."; value.posts[3].evidence = ["Më shumë fibra se formula e kaluar."];
    expect(validateFeedPlan(value, design, brief, "", "mix", true).posts[3].headline).toBe("");
    expect(validateFeedPlan(value, design, { ...brief, description: "Më shumë fibra se formula e kaluar." }, "", "mix", true).posts[3].headline).toBe("Më shumë fibra.");
    const creative = generated(); creative.posts[3].headline = "More festive moments.";
    expect(validateFeedPlan(creative, design, brief, "", "mix", true).posts[3].headline).toBe("More festive moments.");
    value.posts[3].evidence = ["Produkti përmban fibra."];
    expect(validateFeedPlan(value, design, { ...brief, description: "Produkti përmban fibra." }, "", "mix", true).posts[3].headline).toBe("");
    const custom: FeedDesign = { ...design, textRendering: "native", headlines: ["Teksti im i saktë.", ...Array(8).fill("")] };
    expect(validateFeedPlan(generated(), custom, brief, "", "mix", true).posts[0].headline).toBe("Teksti im i saktë.");
  });
  it("gives each renderer its own approved scene, selected source variants and an exact native text safe area", () => {
    const d: FeedDesign = { ...design, format: "4:5" }, plan = feedPlanFixture(d);
    expect(feedCampaignPlanSchema.parse(plan).version).toBe("maro-feed-plan/1");
    for (let slot = 0; slot < 9; slot++) {
      const prompt = buildFeedPrompt({ config: defaultConfig, brief, category: "drinks", slot, variant: 1, brain: "", design: d, plan });
      expect(prompt).toContain(plan.posts[slot].scene); expect(prompt).toContain("TEXT MODE: PLAN-LOCKED");
      expect(prompt).toContain("No invented variants, mini versions"); expect(prompt).not.toContain("TEXT MODE: ON — IMAGE-NATIVE");
      if (plan.posts[slot].headline) expect(prompt).toContain("x=");
      if (slot === 2) { expect(prompt).toContain("MACRO CROPPING CONTRACT"); expect(prompt).not.toContain("keep every complete product"); }
    }
  });
});

describe("exact Feed font and crop-safe text, without title plates", () => {
  it("keeps all nine text boxes inside every final format and outside every original logo corner", () => {
    for (const format of ["1:1", "4:5", "9:16"] as const) for (const logoPosition of ["top-left", "top-right", "bottom-left", "bottom-right"] as const) {
      const d: FeedDesign = { ...design, format, logoPosition, assets: [...design.assets, { index: 3, role: "logo", label: "Logo" }] };
      const logo = feedLogoBox(d), dimensions = feedDimensions(format);
      for (const post of feedPlanFixture(d).posts) {
        const box = feedTypographyBox(d, post.layout);
        expect(box.left).toBeGreaterThanOrEqual(Math.round(dimensions.width * .08)); expect(box.top).toBeGreaterThanOrEqual(Math.round(dimensions.width * .08));
        expect(box.left + box.width).toBeLessThanOrEqual(dimensions.width - Math.round(dimensions.width * .08));
        expect(box.top + box.height).toBeLessThanOrEqual(dimensions.height - Math.round(dimensions.width * .08));
        expect(box.left < logo.left + logo.width && box.left + box.width > logo.left && box.top < logo.top + logo.height && box.top + box.height > logo.top).toBe(false);
      }
    }
  });
  it("stores the exact bundled glyphs over transparent space, preserving surrounding image pixels and quiet posts", async () => {
    const source = await sharp({ create: { width: 1024, height: 1024, channels: 4, background: "#e7f2e8" } }).png().toBuffer();
    for (const font of ["inter", "manrope", "playfair"] as const) {
      const d = { ...design, font }, post = feedPlanFixture(d).posts[0], box = feedTypographyBox(d, post.layout);
      const text = await feedPlannedText(post.headline, d, post, "#202522");
      const expected = await sharp(source).composite([{ input: text.data, left: box.left, top: box.top }]).raw().toBuffer();
      const result = await feedOutputBytes(source, d, undefined, post);
      expect((await sharp(result).raw().toBuffer()).equals(expected)).toBe(true);
      const quiet = await feedOutputBytes(source, d, undefined, { ...post, headline: "" });
      expect((await sharp(quiet).raw().toBuffer()).equals(await sharp(source).raw().toBuffer())).toBe(true);
    }
  });
});
