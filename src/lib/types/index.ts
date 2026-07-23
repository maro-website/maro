// ---------------------------------------------------------------------------
// Maro — Phase 1 local data model
// These types describe the shape of all prototype data. In Phase 2 the mock
// services that produce/consume them get swapped for real APIs; the types stay.
// ---------------------------------------------------------------------------

export type ProjectStatus = "draft" | "generating" | "ready" | "published";

export type WebsiteCategory =
  | "restaurant"
  | "dentist"
  | "agency"
  | "construction"
  | "portfolio"
  | "generic";

export type StyleKey =
  | "minimal"
  | "premium"
  | "bold"
  | "editorial"
  | "modern"
  | "playful"
  | "auto";

export type GenerationMode = "fast" | "smart" | "maximum";

export type LanguageCode = "sq" | "en" | "de";

// Composer selections (Beta): website kind + generation speed.
export type WebsiteKind = "landing" | "business" | "platform";
export type SpeedKey = "slow" | "fast" | "2x";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  avatarUrl?: string;
  /** Subscription plan. "fort" unlocks maroFort mode. */
  plan: "free" | "fort";
  credits: number;
  createdAt: string;
}

// An image generation result (Maro Logo / Maro Reklama), persisted locally.
export interface ImageCreation {
  id: string;
  toolId: string;
  title?: string;
  prompt: string;
  urls: string[];
  size?: string;
  quality?: string;
  favourite?: boolean;
  /** User's reaction to their own creation. */
  reaction?: "like" | "dislike";
  createdAt: string;
}

export interface BrandProfile {
  logoUrl?: string;
  hasLogo: boolean;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
}

export type AssetCategory = "logo" | "brand" | "team" | "products" | "other";

export interface Asset {
  id: string;
  name: string;
  url: string;
  category: AssetCategory;
  createdAt: string;
}

export type SectionKind =
  | "hero"
  | "logos"
  | "features"
  | "gallery"
  | "menu"
  | "services"
  | "work"
  | "team"
  | "stats"
  | "testimonial"
  | "pricing"
  | "cta"
  | "contact"
  | "about"
  | "process";

export interface WebsiteSection {
  id: string;
  kind: SectionKind;
  // Free-form content bag rendered by the preview composition.
  data: Record<string, unknown>;
}

export interface WebsitePage {
  id: string;
  name: string;
  slug: string;
  sections: WebsiteSection[];
  seo: SeoMeta;
}

// A full, self-contained HTML document produced by Claude (max-quality mode).
export interface HtmlPage {
  id: string;
  name: string;
  slug: string;
  html: string;
}

export interface SeoMeta {
  title: string;
  description: string;
  socialImage?: string;
  slug: string;
}

export interface Theme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  headingFont: FontKey;
  bodyFont: FontKey;
  radius: number; // px
  buttonStyle: ButtonStyle;
  dark: boolean;
}

export type FontKey =
  | "Inter"
  | "Manrope"
  | "DM Sans"
  | "Space Grotesk"
  | "Playfair Display"
  | "Instrument Serif"
  | "Plus Jakarta Sans";

export type ButtonStyle = "solid" | "outline" | "soft" | "pill";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  status?: "thinking" | "done";
  createdAt: string;
}

export interface Conversation {
  id: string;
  messages: ChatMessage[];
}

export interface Version {
  id: string;
  label: string;
  createdAt: string;
  // Snapshot of theme + pages so a restore is possible locally.
  snapshot: {
    theme: Theme;
    pages: WebsitePage[];
  };
}

export type CreditReason =
  | "generation"
  | "ai-edit"
  | "large-ai-edit"
  | "manual";

export interface CreditTransaction {
  id: string;
  label: string;
  amount: number; // negative = spend
  reason: CreditReason;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  favourite?: boolean;
  businessName: string;
  tagline?: string;
  email?: string;
  phone?: string;
  location?: string;
  goal: string;
  // Original free-text prompt the user typed in the composer (Beta).
  prompt?: string;
  websiteType?: WebsiteKind;
  speed?: SpeedKey;
  /** Prompt-box selections (model/type/speed) used for cost + prompt. */
  toolSelections?: Record<string, string>;
  /** maroFort expert payload captured at generation time. */
  fort?: import("@/lib/fort/types").FortPayload;
  language: LanguageCode;
  category: WebsiteCategory;
  style: StyleKey;
  generationMode: GenerationMode;
  status: ProjectStatus;
  brand: BrandProfile;
  theme: Theme;
  pages: WebsitePage[];
  activePageId: string;
  // Max-quality output: Claude-authored full HTML pages. When renderMode is
  // "html" the preview/editor render these instead of the section components.
  renderMode?: "sections" | "html";
  htmlPages?: HtmlPage[];
  activeHtmlPageId?: string;
  assets: Asset[];
  conversation: Conversation;
  versions: Version[];
  credits: CreditTransaction[];
  previewUrl: string;
  publishedUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// Wizard draft (before a project is created)
export interface WizardDraft {
  goal: string;
  businessName: string;
  tagline: string;
  email: string;
  phone: string;
  location: string;
  language: LanguageCode;
  logoUrl?: string;
  hasLogo: boolean;
  images: { id: string; url: string }[];
  primaryColor: string;
  secondaryColor: string;
  style: StyleKey;
  generationMode: GenerationMode;
  category: WebsiteCategory;
}
