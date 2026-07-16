import type {
  ButtonStyle,
  FontKey,
  Theme,
  WebsiteCategory,
  WebsitePage,
  WebsiteSection,
} from "@/lib/types";
import type { AiPage, AiSection } from "./types";
import { BUTTON_STYLES, FONT_KEYS, SECTION_KINDS } from "./types";
import { hydrateSectionImages } from "./hydrateImages";
import { uid, slugify } from "@/lib/utils/format";

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const isHex = (v: unknown): v is string => typeof v === "string" && HEX.test(v.trim());

// Keep only known-good theme fields so a hallucinated value can never break the UI.
export function normalizeTheme(patch: Partial<Theme>): Partial<Theme> {
  const out: Partial<Theme> = {};
  if (isHex(patch.primaryColor)) out.primaryColor = patch.primaryColor.trim();
  if (isHex(patch.secondaryColor)) out.secondaryColor = patch.secondaryColor.trim();
  if (isHex(patch.backgroundColor)) out.backgroundColor = patch.backgroundColor.trim();
  if (isHex(patch.textColor)) out.textColor = patch.textColor.trim();
  if (FONT_KEYS.includes(patch.headingFont as FontKey)) out.headingFont = patch.headingFont as FontKey;
  if (FONT_KEYS.includes(patch.bodyFont as FontKey)) out.bodyFont = patch.bodyFont as FontKey;
  if (typeof patch.radius === "number" && Number.isFinite(patch.radius)) {
    out.radius = Math.max(0, Math.min(24, Math.round(patch.radius)));
  }
  if (BUTTON_STYLES.includes(patch.buttonStyle as ButtonStyle)) {
    out.buttonStyle = patch.buttonStyle as ButtonStyle;
  }
  if (typeof patch.dark === "boolean") out.dark = patch.dark;
  return out;
}

const VALID_KINDS = new Set<string>(SECTION_KINDS);

// Validate section kinds, hydrate local images, and assign stable unique ids
// (reusing existing ids where the model preserved them).
export function normalizeSections(
  ai: AiSection[],
  existing: WebsiteSection[],
  category: WebsiteCategory,
  seedBase: string
): WebsiteSection[] {
  const existingIds = new Set(existing.map((s) => s.id));
  const filtered = (Array.isArray(ai) ? ai : []).filter(
    (s) => s && VALID_KINDS.has(s.kind) && s.data && typeof s.data === "object"
  );
  const hydrated = hydrateSectionImages(filtered, category, seedBase);
  const used = new Set<string>();
  return hydrated.map((s) => {
    let id = s.id && existingIds.has(s.id) && !used.has(s.id) ? s.id : uid("sec");
    while (used.has(id)) id = uid("sec");
    used.add(id);
    return { id, kind: s.kind, data: s.data };
  });
}

// Build full WebsitePage[] from an AI generation response.
export function buildPagesFromAi(
  aiPages: AiPage[],
  category: WebsiteCategory,
  businessName: string
): WebsitePage[] {
  const seedBase = slugify(businessName) || "site";
  const usedSlugs = new Set<string>();
  return (Array.isArray(aiPages) ? aiPages : [])
    .map((pg, idx) => {
      const sections = normalizeSections(pg.sections, [], category, `${seedBase}-${idx}`);
      let slug = slugify(pg.slug || pg.name) || (idx === 0 ? "home" : `page-${idx + 1}`);
      while (usedSlugs.has(slug)) slug = `${slug}-${idx}`;
      usedSlugs.add(slug);
      const name = pg.name || (idx === 0 ? "Ballina" : `Faqe ${idx + 1}`);
      const page: WebsitePage = {
        id: uid("page"),
        name,
        slug,
        sections,
        seo: {
          title: pg.seo?.title || `${name} · ${businessName}`,
          description: pg.seo?.description || "",
          slug,
        },
      };
      return page;
    })
    .filter((p) => p.sections.length > 0);
}
