import type { Project, WizardDraft, Asset, WebsiteKind, SpeedKey } from "@/lib/types";
import { makeProject } from "@/lib/mock/demo";
import { uid } from "@/lib/utils/format";

// Derive a short, human business name from a free-text prompt.
function deriveName(prompt: string): string {
  const clean = prompt.trim().replace(/\s+/g, " ");
  if (!clean) return "Website i ri";
  // Prefer a quoted name if present.
  const quoted = clean.match(/["'“”«»]([^"'“”«»]{2,40})["'“”«»]/);
  if (quoted) return quoted[1].trim();
  const words = clean.split(" ").slice(0, 5).join(" ");
  return words.length > 42 ? words.slice(0, 42) + "…" : words;
}

// Build a Project directly from the Beta composer input (prompt + selectors).
export function createProjectFromComposer(input: {
  prompt: string;
  websiteType: WebsiteKind;
  speed: SpeedKey;
  primaryColor?: string;
}): Project {
  const name = deriveName(input.prompt);
  const p = makeProject({
    name,
    businessName: name,
    goal: input.prompt,
    category: "generic",
    style: "auto",
    language: "sq",
    status: "generating",
    primaryColor: input.primaryColor || "#5a28e5",
  });
  p.prompt = input.prompt;
  p.websiteType = input.websiteType;
  p.speed = input.speed;
  return p;
}

// Turn a completed wizard draft into a full Project (status: generating).
export function createProjectFromDraft(draft: WizardDraft): Project {
  const p = makeProject({
    name: draft.businessName || "Website i ri",
    businessName: draft.businessName || "Biznesi im",
    tagline: draft.tagline || undefined,
    goal: draft.goal,
    category: draft.category,
    style: draft.style,
    language: draft.language,
    mode: draft.generationMode,
    email: draft.email || undefined,
    phone: draft.phone || undefined,
    location: draft.location || undefined,
    status: "generating",
    logoUrl: draft.logoUrl,
    primaryColor: draft.primaryColor,
  });

  if (draft.secondaryColor) {
    p.theme.secondaryColor = draft.secondaryColor;
    p.brand.secondaryColor = draft.secondaryColor;
  }

  // Bring uploaded wizard images into the project asset library.
  const uploaded: Asset[] = draft.images.map((im, n) => ({
    id: uid("as"),
    name: `upload-${n + 1}.jpg`,
    url: im.url,
    category: "other",
    createdAt: new Date().toISOString(),
  }));
  if (draft.logoUrl) {
    uploaded.unshift({
      id: uid("as"),
      name: "logo.png",
      url: draft.logoUrl,
      category: "logo",
      createdAt: new Date().toISOString(),
    });
  }
  p.assets = [...uploaded, ...p.assets];

  return p;
}

export const emptyDraft = (): WizardDraft => ({
  goal: "",
  businessName: "",
  tagline: "",
  email: "",
  phone: "",
  location: "",
  language: "sq",
  hasLogo: true,
  images: [],
  primaryColor: "#5a28e5",
  secondaryColor: "#111114",
  style: "auto",
  generationMode: "smart",
  category: "generic",
});
