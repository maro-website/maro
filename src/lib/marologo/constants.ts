export const INDUSTRIES = [
  "Creative Agency",
  "Design Studio",
  "Marketing & Advertising",
  "Technology",
  "Software / SaaS",
  "Artificial Intelligence",
  "E-commerce",
  "Retail",
  "Food & Beverage",
  "Restaurant / Café",
  "Fashion",
  "Beauty & Cosmetics",
  "Health & Wellness",
  "Fitness & Sports",
  "Real Estate",
  "Architecture",
  "Construction",
  "Automotive",
  "Travel & Tourism",
  "Hotel / Hospitality",
  "Finance",
  "Fintech",
  "Insurance",
  "Legal",
  "Consulting",
  "Education",
  "Entertainment",
  "Media",
  "Music",
  "Gaming",
  "Personal Brand",
  "Content Creator",
  "Photography",
  "Video Production",
  "Events",
  "Nonprofit / NGO",
  "Professional Services",
  "Home & Interior",
  "Consumer Products",
  "Kids & Family",
  "Pets",
  "Other",
] as const;

export const INDUSTRY_OTHER = "Other";

export const LOGO_USAGE = [
  "Website",
  "Social Media",
  "Mobile App",
  "Packaging",
  "Product",
  "Print",
  "Advertising",
  "Store / Signage",
  "Storefront / Windows",
  "Vehicle / Fleet",
  "Clothing / Merchandise",
  "Documents / Presentations",
  "Video / Animation",
  "Events",
  "Everything",
] as const;

export const LOGO_USAGE_EVERYTHING = "Everything";

export const BRAND_TRAITS = [
  "Minimal",
  "Bold",
  "Premium",
  "Playful",
  "Elegant",
  "Modern",
  "Technical",
  "Friendly",
  "Serious",
  "Experimental",
  "Luxury",
  "Organic",
  "Futuristic",
  "Timeless",
  "Raw",
  "Youthful",
] as const;

export const MAX_TRAITS = 3;

export const LOGO_TYPES = [
  { value: "wordmark", label: "Wordmark" },
  { value: "symbol", label: "Symbol" },
  { value: "symbol_wordmark", label: "Symbol + Wordmark" },
  { value: "maro_decides", label: "Maro vendos" },
] as const;

export const CONCEPT_INTENTS = [
  { value: "maro_decides", label: "Maro vendos", description: "Zgjedh prioritetin nga konteksti i brendit." },
  { value: "meaning", label: "Meaning First", description: "Ideja dhe domethënia udhëheqin formën." },
  { value: "typography", label: "Typography First", description: "Emri dhe shkronjat janë ideja kryesore." },
  { value: "symbol", label: "Symbol First", description: "Një shenjë e dallueshme udhëheq sistemin." },
] as const;

export const VISUAL_STYLE_OPTIONS = [
  { value: "maro_decides", label: "Maro vendos" },
  { value: "minimal_intelligent", label: "Minimal & intelligent" },
  { value: "bold_distinctive", label: "Bold & distinctive" },
  { value: "elegant_refined", label: "Elegant & refined" },
  { value: "playful_friendly", label: "Playful & friendly" },
  { value: "organic_human", label: "Organic & human" },
  { value: "technical_precise", label: "Technical & precise" },
  { value: "editorial_expressive", label: "Editorial & expressive" },
] as const;

export const PRESENTATION_MODES = [
  { value: "bw", label: "Black & White", description: "Teston formën dhe njohshmërinë pa ndihmën e ngjyrës." },
  { value: "color", label: "Color", description: "Prezantim i pastër i identitetit me paletën e brendit." },
  { value: "mockup", label: "Logo Mockup", description: "Një aplikim premium, i zgjedhur sipas biznesit." },
  { value: "bento", label: "Bento Grid", description: "Një sistem koheziv identiteti në një pamje.", recommended: true },
] as const;

export const PRESENTATION_LABELS: Record<string, string> = {
  bw: "Black & White",
  color: "Color",
  mockup: "Logo Mockup",
  bento: "Bento Grid",
};

export const SYMBOL_DIRECTIONS = [
  "Literal",
  "Abstract",
  "Geometric",
  "Typographic",
  "Mascot",
  "Monogram",
  "No preference",
] as const;

export const TYPOGRAPHY_OPTIONS = [
  { value: "clean_sans", label: "Clean Sans Serif", previewFont: "Inter" },
  { value: "geometric_sans", label: "Geometric Sans", previewFont: "Sora" },
  { value: "humanist_sans", label: "Humanist Sans", previewFont: "Source Sans 3" },
  { value: "serif", label: "Serif", previewFont: "Libre Baskerville" },
  { value: "elegant_serif", label: "Elegant Serif", previewFont: "Cormorant Garamond" },
  { value: "display", label: "Display", previewFont: "Bebas Neue" },
  { value: "handwritten", label: "Handwritten", previewFont: "Caveat" },
  { value: "experimental", label: "Experimental", previewFont: "Syne" },
  { value: "maro_decides", label: "Let Maro Decide", previewFont: "Manrope" },
] as const;

export const CREATIVE_FREEDOM_OPTIONS = [
  {
    value: "precise" as const,
    label: "Precise",
    description: "Qëndro afër brief-it.",
  },
  {
    value: "balanced" as const,
    label: "Balanced",
    description: "Brief + pak eksplorim kreativ.",
  },
  {
    value: "wild" as const,
    label: "Wild",
    description: "Maro mundet me sfidu brief-in.",
  },
];

export const DIRECTION_SLIDER_LABELS = [
  { key: "simpleExpressive" as const, left: "Simple", right: "Expressive" },
  { key: "classicModern" as const, left: "Classic", right: "Modern" },
  { key: "friendlySerious" as const, left: "Friendly", right: "Serious" },
  { key: "accessiblePremium" as const, left: "Accessible", right: "Premium" },
  { key: "safeExperimental" as const, left: "Safe", right: "Experimental" },
];

export const TYPOGRAPHY_SLIDER_LABELS = [
  { key: "thinBold" as const, left: "Thin", right: "Bold" },
  { key: "softSharp" as const, left: "Soft", right: "Sharp" },
  { key: "compactWide" as const, left: "Compact", right: "Wide" },
];

export const ADVANCED_SLIDER_LABELS = [
  { key: "simplicity" as const, left: "Detailed", right: "Minimal", label: "Simplicity:" },
  { key: "geometry" as const, left: "Organic", right: "Geometric", label: "Geometry:" },
  { key: "personality" as const, left: "Neutral", right: "Distinctive", label: "Personality:" },
  { key: "timelessness" as const, left: "Trendy", right: "Timeless", label: "Timelessness:" },
  { key: "symmetry" as const, left: "Asymmetric", right: "Symmetric", label: "Symmetry:" },
];

export const MAX_REFERENCE_IMAGES = 3;
export const MAX_REFERENCE_BYTES = 8 * 1024 * 1024;
export const MAX_COLORS = 6;

export const LOGO_TYPE_LABELS: Record<string, string> = {
  wordmark: "Wordmark",
  symbol: "Symbol",
  symbol_wordmark: "Symbol + Wordmark",
  maro_decides: "Maro decides",
};
