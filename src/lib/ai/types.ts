// Shared request/response contracts for the Maro AI endpoints.
// These are used by both the client services and the server API routes, so this
// file must stay free of any server-only imports.

import type {
  ButtonStyle,
  FontKey,
  SectionKind,
  Theme,
  WebsiteCategory,
} from "@/lib/types";

// A section as exchanged with the model (no stable id required on the way back).
export interface AiSection {
  id?: string;
  kind: SectionKind;
  data: Record<string, unknown>;
}

export interface AiPage {
  name: string;
  slug: string;
  sections: AiSection[];
  seo?: { title: string; description: string; slug: string };
}

// ---- Edit (in-editor chat) ----

export interface AiEditRequest {
  instruction: string;
  businessName: string;
  category: WebsiteCategory;
  language: string;
  theme: Theme;
  page: { id: string; name: string; sections: AiSection[] };
  assetUrls: string[];
}

export interface AiEditResponse {
  reply: string;
  versionLabel: string;
  cost: number;
  theme?: Partial<Theme> | null;
  sections?: AiSection[] | null;
}

// ---- Generate (wizard -> full site) ----

export type WebsiteKind = "landing" | "business" | "platform";
export type SpeedKey = "slow" | "fast" | "2x";

export interface AiGenerateRequest {
  businessName: string;
  goal: string;
  tagline?: string;
  category: WebsiteCategory;
  language: string;
  email?: string;
  phone?: string;
  location?: string;
  primaryColor: string;
  // Beta composer fields
  userPrompt?: string;
  websiteType?: WebsiteKind;
  speed?: SpeedKey;
}

export interface AiGenerateResponse {
  theme?: Partial<Theme> | null;
  pages: AiPage[];
}

// ---- HTML mode (max quality: Claude authors full HTML pages) ----

export interface AiHtmlPage {
  name: string;
  slug: string;
  html: string;
}

export interface AiGenerateHtmlResponse {
  pages: AiHtmlPage[];
  creditsSpent?: number;
}

export interface AiEditHtmlRequest {
  instruction: string;
  businessName: string;
  language: string;
  page: { name: string; slug: string; html: string };
}

export interface AiEditHtmlResponse {
  reply: string;
  versionLabel: string;
  cost: number;
  html: string;
}

export const FONT_KEYS: FontKey[] = [
  "Inter",
  "Manrope",
  "DM Sans",
  "Space Grotesk",
  "Playfair Display",
  "Instrument Serif",
  "Plus Jakarta Sans",
];

export const BUTTON_STYLES: ButtonStyle[] = ["solid", "outline", "soft", "pill"];

export const SECTION_KINDS: SectionKind[] = [
  "hero",
  "logos",
  "features",
  "gallery",
  "menu",
  "services",
  "work",
  "team",
  "stats",
  "testimonial",
  "pricing",
  "cta",
  "contact",
  "about",
  "process",
];
