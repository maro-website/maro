import type { Theme, WebsiteCategory, StyleKey } from "@/lib/types";

// Distinct visual identity per category so Maro never "generates" the same
// design language twice. Each preset is a full Theme.
export const CATEGORY_THEMES: Record<WebsiteCategory, Theme> = {
  restaurant: {
    primaryColor: "#8a5a2b",
    secondaryColor: "#c9a15e",
    backgroundColor: "#faf6f0",
    textColor: "#2a2018",
    headingFont: "Playfair Display",
    bodyFont: "DM Sans",
    radius: 4,
    buttonStyle: "solid",
    dark: false,
  },
  dentist: {
    primaryColor: "#0ea5b7",
    secondaryColor: "#2563eb",
    backgroundColor: "#ffffff",
    textColor: "#0f2231",
    headingFont: "Manrope",
    bodyFont: "Inter",
    radius: 16,
    buttonStyle: "pill",
    dark: false,
  },
  agency: {
    primaryColor: "#5a28e5",
    secondaryColor: "#111114",
    backgroundColor: "#ffffff",
    textColor: "#101014",
    headingFont: "Space Grotesk",
    bodyFont: "Inter",
    radius: 6,
    buttonStyle: "solid",
    dark: false,
  },
  construction: {
    primaryColor: "#ea580c",
    secondaryColor: "#1f2937",
    backgroundColor: "#f7f7f5",
    textColor: "#17181b",
    headingFont: "Space Grotesk",
    bodyFont: "Inter",
    radius: 2,
    buttonStyle: "solid",
    dark: false,
  },
  portfolio: {
    primaryColor: "#111114",
    secondaryColor: "#5a28e5",
    backgroundColor: "#ffffff",
    textColor: "#0b0b0d",
    headingFont: "Instrument Serif",
    bodyFont: "DM Sans",
    radius: 10,
    buttonStyle: "outline",
    dark: false,
  },
  generic: {
    primaryColor: "#5a28e5",
    secondaryColor: "#111114",
    backgroundColor: "#ffffff",
    textColor: "#101014",
    headingFont: "Manrope",
    bodyFont: "Inter",
    radius: 12,
    buttonStyle: "solid",
    dark: false,
  },
};

// Style choices nudge the base category theme (radius / button feel).
export function applyStyle(theme: Theme, style: StyleKey): Theme {
  const t = { ...theme };
  switch (style) {
    case "minimal":
      t.radius = 4;
      t.buttonStyle = "outline";
      break;
    case "premium":
      t.radius = 2;
      t.buttonStyle = "solid";
      break;
    case "bold":
      t.radius = 0;
      t.buttonStyle = "solid";
      break;
    case "editorial":
      t.headingFont = "Playfair Display";
      t.radius = 6;
      break;
    case "modern":
      t.radius = 14;
      t.buttonStyle = "solid";
      break;
    case "playful":
      t.radius = 20;
      t.buttonStyle = "pill";
      break;
    default:
      break;
  }
  return t;
}

export function detectCategory(text: string): WebsiteCategory {
  const t = text.toLowerCase();
  const has = (...w: string[]) => w.some((x) => t.includes(x));
  if (has("restaurant", "restorant", "food", "ushqim", "kuzhin", "menu", "cafe", "bar", "pizzeri", "kafe"))
    return "restaurant";
  if (has("dentist", "dental", "dentist", "klinik", "shëndet", "shendet", "mjek", "clinic", "smile", "dhëmb", "dhemb"))
    return "dentist";
  if (has("agency", "agjenci", "creative", "kreativ", "studio", "design", "dizajn", "brand", "marketing"))
    return "agency";
  if (has("construction", "ndërtim", "ndertim", "kopsht", "garden", "landscap", "build", "renovat", "kontraktor", "instalim"))
    return "construction";
  if (has("portfolio", "personal", "cv", "resume", "photographer", "fotograf", "artist", "developer"))
    return "portfolio";
  return "generic";
}
