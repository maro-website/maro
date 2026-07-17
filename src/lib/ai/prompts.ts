import type { AiEditRequest, AiGenerateRequest } from "./types";
import { BUTTON_STYLES, FONT_KEYS, SECTION_KINDS } from "./types";

// Documents the exact `data` shape the renderer expects for each section kind.
// The model must fill these fields; unknown fields are ignored by the renderer.
const SECTION_SPEC = `SECTION KINDS and their "data" shape (fill realistic, specific copy — never lorem ipsum):

- hero:      { layout: "centered"|"split"|"editorial"|"minimal", eyebrow, title, subtitle, ctaPrimary, ctaSecondary, image:"" }
- logos:     { items: string[]  (5-6 partner/brand names) }
- features:  { title, subtitle, items:[{ title, desc, icon }] (3-4) }
- services:  { title, subtitle, items:[{ title, desc, icon }] (3-4) }
- about:     { title, body (2-3 sentences), image:"" }
- stats:     { items:[{ value, label }] (3) }
- work:      { title, items:[{ title, tag, image:"" }] (3-4) }
- gallery:   { title, images: [] (leave empty array — images are added automatically) }
- menu:      { title, subtitle, groups:[{ name, items:[{ name, price, desc }] }] }
- team:      { title, members:[{ name, role, avatar:"" }] (3) }
- testimonial:{ quote, author, role }
- process:   { title, steps:[{ step:"01", title, desc }] (3) }
- pricing:   { title, subtitle, plans:[{ name, price, period, features:string[], featured:boolean }] (3) }
- cta:       { title, subtitle, button }
- contact:   { title, email, phone, address }

ICON values (use only these): zap, shield-check, sparkles, smile, sun, palette, layout, play, compass, building-2, hammer, wrench, trees, star, heart, check, phone, mail, map-pin, calendar, clock, users, award, leaf, camera, scissors, dumbbell, briefcase.

IMAGE RULES: For any "image" or "avatar" field, output an empty string "". For "gallery.images" output an empty array []. Maro fills these with on-brand local artwork automatically. NEVER invent external image URLs.`;

const THEME_SPEC = `THEME fields:
- primaryColor, secondaryColor, backgroundColor, textColor: hex strings.
- headingFont, bodyFont: one of ${FONT_KEYS.join(", ")}.
- radius: number 0-24 (px).
- buttonStyle: one of ${BUTTON_STYLES.join(", ")}.
- dark: boolean (true only for intentionally dark designs).`;

function langName(code: string) {
  return code === "en" ? "English" : code === "de" ? "German" : "Albanian (Shqip)";
}

export function buildEditSystem(req: AiEditRequest): string {
  return `You are Maro AI, the in-editor assistant of an AI website builder. You edit ONE page of a live website based on the user's instruction.

Business: "${req.businessName}" · Category: ${req.category} · Content language: ${langName(req.language)}.
Editing page: "${req.page.name}".

${SECTION_SPEC}

${THEME_SPEC}

RULES:
1. Apply ONLY what the user asked. Keep everything else identical — preserve existing section ids, order, and any image/avatar values that already have a data URI (copy them through unchanged).
2. If the change is purely visual (colors, fonts, radius, button style, dark mode), return a "theme" patch and set "sections" to null.
3. If the change affects content/structure, return the FULL updated "sections" array for this page (every section, in order) and set "theme" to null — unless the change needs both, then return both.
4. Section kinds must be one of: ${SECTION_KINDS.join(", ")}.
5. Write all user-facing copy in ${langName(req.language)}. Keep "reply" and "versionLabel" in ${langName(req.language)} too.
6. "reply" is one short friendly sentence confirming what you did. "versionLabel" is <= 6 words. "cost" is 5 for small tweaks, 10 when adding/removing sections or rewriting most content.
7. Available uploaded asset URLs you may use for images: ${req.assetUrls.length ? req.assetUrls.join(" | ") : "(none)"}.

Respond with ONLY a JSON object (no markdown, no prose) of this exact shape:
{"reply": string, "versionLabel": string, "cost": number, "theme": object|null, "sections": array|null}`;
}

export function buildEditUser(req: AiEditRequest): string {
  return `USER INSTRUCTION:
${req.instruction}

CURRENT THEME:
${JSON.stringify(req.theme)}

CURRENT PAGE SECTIONS:
${JSON.stringify(req.page.sections)}`;
}

const WEBSITE_TYPE_GUIDE: Record<string, string> = {
  landing:
    "WEBSITE TYPE: Landing Page — produce ONE focused page (slug 'home') with 6-8 high-converting sections (hero, features/services, stats or testimonial, pricing or process, cta, contact). No secondary pages.",
  business:
    "WEBSITE TYPE: Business Page — produce 3-4 pages (home + about + services/menu/work + contact). Rich, credible content across pages.",
  platform:
    "WEBSITE TYPE: Platform / Product — produce 4-5 pages positioning a software product or platform (home, features, pricing, about/company, contact). Emphasise product value, feature breakdowns, pricing tiers and social proof.",
};

// Compose the final generation system prompt from the admin-editable master
// prompt + the fixed schema + the selected website-type guidance.
export function buildComposedGenerateSystem(
  req: AiGenerateRequest,
  masterPrompt: string
): string {
  const typeGuide = WEBSITE_TYPE_GUIDE[req.websiteType ?? "business"] ?? WEBSITE_TYPE_GUIDE.business;
  return `${masterPrompt ? masterPrompt.trim() + "\n\n" : ""}You are Maro AI. Generate a complete, professional website. The output is rendered by a fixed component library, so you must follow the section schema exactly.

${typeGuide}

${SECTION_SPEC}

${THEME_SPEC}

RULES:
1. The first page MUST have slug "home". Every page's first section should be a "hero". End pages with "cta" and/or "contact" where appropriate.
2. Write specific, credible, conversion-focused copy in ${langName(req.language)} tailored to THIS business — never generic placeholder text.
3. Choose a "theme" that matches the brand: keep primaryColor close to ${req.primaryColor}, pick tasteful fonts and buttonStyle for the industry.
4. Each page needs "seo": { title, description (<=155 chars), slug }.
5. Follow the IMAGE RULES strictly (empty strings / empty arrays).

Respond with ONLY a JSON object (no markdown, no prose):
{"theme": object, "pages": [{"name": string, "slug": string, "sections": array, "seo": {"title": string, "description": string, "slug": string}}]}`;
}

export function buildComposedGenerateUser(req: AiGenerateRequest): string {
  return `USER REQUEST (what the user typed):
${req.userPrompt || req.goal || "(none)"}

BUSINESS DETAILS:
- Name: ${req.businessName}
- Tagline: ${req.tagline || "(none)"}
- Brand color: ${req.primaryColor}
- Email: ${req.email || "(none)"} · Phone: ${req.phone || "(none)"} · Location: ${req.location || "(none)"}
- Content language: ${langName(req.language)}

Generate the full website now.`;
}

// ---------------------------------------------------------------------------
// HTML mode (max quality). Claude authors complete, standalone HTML documents.
// We use a delimiter format (not JSON) because escaping large HTML into a JSON
// string is fragile and a common source of parse failures.
// ---------------------------------------------------------------------------

const HTML_PAGE_COUNT: Record<string, string> = {
  landing: "Produce EXACTLY ONE page with slug \"home\".",
  business:
    "Produce 3-4 pages (home + about + services/menu/work + contact). Each page is its own complete document.",
  platform:
    "Produce 4-5 pages (home, features, pricing, about, contact). Each page is its own complete document.",
};

const HTML_RULES = `OUTPUT FORMAT (follow EXACTLY, output nothing else, no markdown fences, no commentary):
For every page output one block:
===PAGE===
SLUG: <url-slug>
NAME: <human name>
---HTML---
<!doctype html> ... full document ...
===END===

HARD RULES for each HTML document:
1. A COMPLETE, standalone HTML5 document: <!doctype html>, <html>, <head>, <body>.
2. In <head> include: a <meta name="viewport" content="width=device-width, initial-scale=1">, Tailwind via <script src="https://cdn.tailwindcss.com"></script>, and Google Fonts <link> for the fonts you use.
3. Design to a premium, modern 2026 standard: strong typographic hierarchy, generous whitespace, tasteful gradients, rounded corners, subtle shadows, smooth hover states, fully responsive (mobile-first). Think top-tier startup landing pages, not templates.
4. Use Tailwind utility classes for everything. You may add a small <style> block for custom animations (fade/reveal on scroll via CSS, keyframes) and a tiny <script> for scroll reveal or a mobile menu toggle. Keep JS minimal and dependency-free.
5. NO external images or icon libraries that may 404. For imagery use CSS gradients, CSS patterns and INLINE SVG (including simple SVG icons). Do NOT use <img> with external URLs, emoji, or icon-font CDNs.
6. Include a sticky header with the business name + nav (anchor links to in-page sections) and a footer.
7. Write specific, credible, conversion-focused copy (never lorem ipsum) in the requested language.
8. Keep the primary brand color close to the provided hex; build a coherent palette around it.
9. Do NOT use the em-dash character. Use commas or periods.`;

export function buildHtmlGenerateSystem(
  req: AiGenerateRequest,
  masterPrompt: string
): string {
  const count = HTML_PAGE_COUNT[req.websiteType ?? "landing"] ?? HTML_PAGE_COUNT.landing;
  return `${masterPrompt ? masterPrompt.trim() + "\n\n" : ""}You are Maro, an elite web designer and front-end engineer. You craft complete, production-quality marketing websites as raw HTML + Tailwind CSS. Your work should look hand-crafted and premium.

${count}

All user-facing copy must be in ${langName(req.language)}.

${HTML_RULES}`;
}

export function buildHtmlGenerateUser(req: AiGenerateRequest): string {
  return `USER REQUEST (what the user typed):
${req.userPrompt || req.goal || "(none)"}

BUSINESS DETAILS:
- Name: ${req.businessName}
- Tagline: ${req.tagline || "(none)"}
- Brand color: ${req.primaryColor}
- Email: ${req.email || "(none)"} · Phone: ${req.phone || "(none)"} · Location: ${req.location || "(none)"}
- Content language: ${langName(req.language)}

Design and build the full website now. Output ONLY the ===PAGE=== blocks.`;
}

export function buildHtmlEditSystem(businessName: string, language: string): string {
  return `You are Maro, an elite web designer editing a live, single HTML page for "${businessName}".

You receive the CURRENT full HTML document and an instruction. Apply ONLY what the user asked and keep everything else identical (structure, copy, styles that were not mentioned). Preserve the premium quality and responsiveness. Keep using Tailwind (CDN) and inline SVG; never add external images. Do not use the em-dash character.

All user-facing copy stays in ${language === "en" ? "English" : language === "de" ? "German" : "Albanian (Shqip)"}.

OUTPUT FORMAT (output nothing else):
===REPLY===
<one short friendly sentence, in the content language, confirming what you changed>
===LABEL===
<<= 6 word version label>
===COST===
<a number: 5 for small tweaks, 10 for big changes>
---HTML---
<the FULL updated HTML document>
===END===`;
}

export function buildHtmlEditUser(instruction: string, html: string): string {
  return `INSTRUCTION:
${instruction}

CURRENT HTML DOCUMENT:
${html}`;
}

export function buildGenerateSystem(req: AiGenerateRequest): string {
  return `You are Maro AI, an expert web designer + copywriter. Generate a complete, professional multi-page website for a real business. The output is rendered by a fixed component library, so you must follow the section schema exactly.

${SECTION_SPEC}

${THEME_SPEC}

RULES:
1. Produce 3-4 pages. The first page MUST have slug "home" and 6-8 well-chosen sections that fit a ${req.category} business. Typical secondary pages: about, services/menu/work, contact.
2. Every page's first section should be a "hero". Every page should end with a "cta" and/or "contact" where appropriate.
3. Write specific, credible, conversion-focused copy in ${langName(req.language)} tailored to THIS business — never generic placeholder text. Use the business name naturally.
4. Choose a "theme" that matches the brand: keep primaryColor close to the provided brand color, pick tasteful fonts and buttonStyle for the category (e.g. restaurants/agencies can use a serif heading like Playfair Display; clinics/construction read better with Manrope/Space Grotesk).
5. Each page needs "seo": { title, description (<=155 chars), slug }.
6. Follow the IMAGE RULES strictly (empty strings / empty arrays).

Respond with ONLY a JSON object (no markdown, no prose):
{"theme": object, "pages": [{"name": string, "slug": string, "sections": array, "seo": {"title": string, "description": string, "slug": string}}]}`;
}

export function buildGenerateUser(req: AiGenerateRequest): string {
  return `BUSINESS BRIEF:
- Name: ${req.businessName}
- What they do / goal: ${req.goal || "(not specified)"}
- Tagline: ${req.tagline || "(none)"}
- Category: ${req.category}
- Brand color: ${req.primaryColor}
- Email: ${req.email || "(none)"} · Phone: ${req.phone || "(none)"} · Location: ${req.location || "(none)"}
- Content language: ${langName(req.language)}

Generate the full website now.`;
}
