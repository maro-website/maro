import { z } from "zod";
import { feedDimensions, feedHeadline, feedLogoBox, type FeedDesign } from "./campaign";
import type { FeedBrief, FeedContentType } from "./model";

export const FEED_PLAN_VERSION = "maro-feed-plan/1";
export const feedLayouts = ["studio", "lifestyle", "macro", "graphic", "sculpture", "process", "atmosphere", "interactive", "conversion"] as const;
export type FeedLayout = typeof feedLayouts[number];
const short = (min: number, max: number) => z.string().trim().min(min).max(max);
export const generatedFeedPlanSchema = z.object({
  look: short(30, 650),
  sources: z.array(z.object({
    index: z.number().int().min(0).max(9), kind: z.enum(["single", "collection", "service"]),
    products: z.array(z.object({ name: short(1, 90), identity: short(8, 240) }).strict()).min(1).max(12),
  }).strict()).min(1).max(10),
  posts: z.array(z.object({
    slot: z.number().int().min(0).max(8), layout: z.enum(feedLayouts),
    concept: short(12, 220), scene: short(20, 650),
    camera: z.enum(["front", "low", "overhead", "side", "diagonal", "macro", "wide", "eye-level", "backlit"]),
    subjects: z.array(z.object({ reference: z.number().int().min(0).max(9), product: short(1, 90) }).strict()).min(1).max(16),
    headline: short(0, 60), evidence: z.array(short(8, 240)).max(4),
  }).strict()).length(9),
}).strict();
export type GeneratedFeedPlan = z.infer<typeof generatedFeedPlanSchema>;
export type FeedPlanPost = GeneratedFeedPlan["posts"][number];
export type FeedCampaignPlan = GeneratedFeedPlan & { version: typeof FEED_PLAN_VERSION; optimizer: { attemptId: string; model: string; sourceHash: string } };
export type FeedPlanReference = Pick<FeedCampaignPlan, "version" | "optimizer">;
export const feedPlanReference = ({ version, optimizer }: FeedCampaignPlan): FeedPlanReference => ({ version, optimizer });
export const feedCampaignPlanSchema = generatedFeedPlanSchema.extend({
  version: z.literal(FEED_PLAN_VERSION),
  optimizer: z.object({ attemptId: z.string().min(1), model: z.string().min(1), sourceHash: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
}).strict();
const singleLayouts: Record<Exclude<FeedContentType, "mix">, FeedLayout> = { hero: "studio", lifestyle: "lifestyle", detail: "macro", benefit: "graphic", signature: "sculpture", ritual: "process", mood: "atmosphere", engagement: "interactive", conversion: "conversion" };
export const feedPostLayout = (slot: number, type: FeedContentType) => type === "mix" ? feedLayouts[slot] : singleLayouts[type];
const normalize = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Provider output is untrusted. Keep the user's asset assignments and reject fabricated claim support. */
export function validateFeedPlan(value: unknown, design: FeedDesign, brief: FeedBrief, brain: string, type: FeedContentType, textMode: boolean) {
  const plan = generatedFeedPlanSchema.parse(value);
  if (new Set(plan.posts.map(post => post.slot)).size === 9) plan.posts.sort((a, b) => a.slot - b.slot);
  const products = design.assets.filter(asset => asset.role === "product");
  if (plan.sources.length !== products.length || new Set(plan.sources.map(source => source.index)).size !== products.length ||
    products.some(asset => !plan.sources.some(source => source.index === asset.index))) throw new Error("feed_plan_sources");
  for (const source of plan.sources) {
    if (new Set(source.products.map(product => normalize(product.name))).size !== source.products.length) throw new Error("feed_plan_sources");
    if (source.kind !== "service") source.kind = source.products.length > 1 ? "collection" : "single";
  }
  const facts = normalize([brief.brand, brief.description, brief.notes, brain].join("\n"));
  const coverage = new Map<number, Set<string>>();
  const concepts = new Set<string>(), scenes = new Set<string>(), headlines = new Set<string>();
  plan.posts.forEach((post, slot) => {
    if (post.slot !== slot) throw new Error("feed_plan_layout");
    post.layout = feedPostLayout(slot, type);
    if (concepts.has(normalize(post.concept)) || scenes.has(normalize(post.scene))) throw new Error("feed_plan_repeated");
    concepts.add(normalize(post.concept)); scenes.add(normalize(post.scene));
    const selected = new Set<string>();
    for (const subject of post.subjects) {
      const source = plan.sources.find(item => item.index === subject.reference);
      if (source) {
        const key = (name: string) => normalize(name).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
        const exact = source.products.filter(product => key(product.name) === key(subject.product));
        const words = (name: string) => key(name).split(" ").filter(word => word.length > 2 && ![...key(brief.brand).split(" "), "soda", "drink", "product", "produkti", "can"].includes(word));
        const requested = words(subject.product);
        const aliases = source.products.filter(product => { const catalog = words(product.name); return requested.length > 0 && catalog.length > 0 && (requested.every(word => catalog.includes(word)) || catalog.every(word => requested.includes(word))); });
        const match = exact.length === 1 ? exact[0] : source.products.length === 1 ? source.products[0] : aliases.length === 1 ? aliases[0] : undefined;
        if (match) subject.product = match.name;
      }
      const identity = `${subject.reference}:${subject.product}`;
      if (!design.assignments[slot].includes(subject.reference) || !source?.products.some(product => product.name === subject.product) || selected.has(identity)) throw new Error("feed_plan_subjects");
      selected.add(identity);
      const names = coverage.get(subject.reference) ?? new Set<string>(); names.add(subject.product); coverage.set(subject.reference, names);
    }
    if (design.assignments[slot].some(index => !post.subjects.some(subject => subject.reference === index))) throw new Error("feed_plan_subjects");
    post.evidence = post.evidence.filter(quote => facts.includes(normalize(quote)));
    const supplied = feedHeadline(design, slot, brief.brand);
    post.headline = !textMode ? "" : supplied || post.headline;
    if (!supplied && post.headline) {
      // Nutritional/comparative/offer/size copy needs matching textual evidence, never guessed from a picture.
      const risky: string[] = normalize(post.headline).match(/\d+(?:[.,]\d+)?|[%€$]|\b(?:mini|fibr\w*|fiber\w*|protein\w*|vitamin\w*|sheqer\w*|sugar\w*|kalori\w*|calori\w*|organic\w*|bio|vegan\w*|natyral\w*|natural\w*|shendet\w*|health\w*|zero|falas|gratis|discount\w*)\b/g) ?? [];
      // "More festive moments" is creative copy; "more fiber" is a supported-comparison requirement.
      if (risky.length) risky.push(...(normalize(post.headline).match(/\b(?:me shume|me pak|more|less|pa sheqer)\b/g) ?? []));
      const evidence = normalize(post.evidence.join(" "));
      if (risky.some(term => !evidence.includes(term.trim())) || headlines.has(normalize(post.headline))) { post.headline = ""; post.evidence = []; }
      else headlines.add(normalize(post.headline));
    }
  });
  for (const source of plan.sources) {
    const uses = design.assignments.filter(row => row.includes(source.index)).length;
    const selected = plan.posts.flatMap(post => post.subjects.filter(subject => subject.reference === source.index));
    const counts = new Map<string, number>(); for (const subject of selected) counts.set(subject.product, (counts.get(subject.product) ?? 0) + 1);
    const target = Math.min(source.products.length, uses);
    for (const product of source.products) {
      if (counts.size >= target) break;
      if (counts.has(product.name)) continue;
      const replace = selected.find(subject => (counts.get(subject.product) ?? 0) > 1);
      if (!replace) throw new Error("feed_plan_coverage");
      counts.set(replace.product, counts.get(replace.product)! - 1); replace.product = product.name; counts.set(product.name, 1);
    }
  }
  if (new Set(plan.posts.map(post => post.camera)).size < 4) plan.posts.forEach((post, slot) => { post.camera = ([post.layout === "macro" ? "macro" : "front", "side", "diagonal", "backlit"] as const)[slot % 4]; });
  if (JSON.stringify(plan).length > 28_000) throw new Error("feed_plan_too_large");
  return plan;
}

/** Every text rectangle stays inside the final crop and away from the original-logo box. */
export function feedTypographyBox(design: FeedDesign, layout: FeedLayout) {
  const { width, height } = feedDimensions(design.format), margin = Math.round(width * .08);
  const positions: Record<FeedLayout, [number, number, number, number]> = {
    studio: [.08, .08, .84, .28], lifestyle: [.08, .68, .60, .22], macro: [.30, .70, .62, .20],
    graphic: [.08, .20, .48, .56], sculpture: [.30, .08, .62, .28], process: [.08, .08, .54, .30],
    atmosphere: [.08, .68, .64, .22], interactive: [.08, .08, .84, .36], conversion: [.08, .62, .84, .28],
  };
  const [x, y, w, h] = positions[layout];
  const box = { left: Math.round(x * width), top: Math.round(y * height), width: Math.round(w * width), height: Math.round(h * height) };
  const logo = feedLogoBox(design);
  const overlaps = () => box.left < logo.left + logo.width + 12 && box.left + box.width + 12 > logo.left && box.top < logo.top + logo.height + 12 && box.top + box.height + 12 > logo.top;
  if (design.assets.some(asset => asset.role === "logo") && overlaps()) {
    const gap = Math.round(width * .03);
    box.top = design.logoPosition.startsWith("bottom") ? logo.top - gap - box.height : logo.top + logo.height + gap;
  }
  box.left = Math.max(margin, Math.min(box.left, width - margin - box.width));
  box.top = Math.max(margin, Math.min(box.top, height - margin - box.height));
  return box;
}

export function feedNativeTextBox(design: FeedDesign, layout: FeedLayout) {
  const box = feedTypographyBox(design, layout);
  return { ...box, left: box.left + (design.format === "9:16" ? 80 : 0), top: box.top + (design.format === "4:5" ? 128 : 0) };
}
