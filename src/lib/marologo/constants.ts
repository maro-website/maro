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

export const MAX_TRAITS = 5;

export const LOGO_TYPES = [
  { value: "wordmark", label: "Wordmark" },
  { value: "symbol", label: "Symbol" },
  { value: "symbol_wordmark", label: "Symbol + Wordmark" },
  { value: "maro_decides", label: "Leja maro le t'vendos" },
] as const;

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
