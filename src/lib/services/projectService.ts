import type { Project, WizardDraft, Asset, WebsiteKind, SpeedKey } from "@/lib/types";
import type { FortPayload } from "@/lib/fort/types";
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

// Map the new "Lloji" option ids onto the legacy WebsiteKind pipeline.
const TYPE_TO_KIND: Record<string, WebsiteKind> = {
  landing: "landing",
  standard: "business",
  pro: "platform",
  expert: "platform",
};

// Build a Project directly from the Beta composer input (prompt + selectors).
export function createProjectFromComposer(input: {
  prompt: string;
  websiteType: WebsiteKind;
  speed: SpeedKey;
  primaryColor?: string;
  selections?: Record<string, string>;
  fort?: FortPayload;
  maroPromptId?: string;
  workspaceId?: string;
  referenceImages?: string[];
}): Project {
  const name = deriveName(input.prompt);
  const p = makeProject({
    name,
    businessName: name,
    goal: input.prompt,
    category: "generic",
    style: "auto",
    language: "auto",
    status: "generating",
    ...(input.primaryColor ? { primaryColor: input.primaryColor } : {}),
  });
  if (input.primaryColor) p.explicitBrandColor = input.primaryColor;
  p.prompt = input.prompt;
  p.websiteType = input.websiteType;
  p.speed = input.speed;
  p.toolSelections = input.selections;
  if (input.fort?.enabled) p.fort = input.fort;
  if (input.maroPromptId) p.maroPromptId = input.maroPromptId;
  if (input.workspaceId) p.workspaceId = input.workspaceId;
  if (input.referenceImages?.length) {
    const createdAt = new Date().toISOString();
    p.referenceImages = [...input.referenceImages];
    p.assets = [
      ...input.referenceImages.map((url, index): Asset => ({
        id: uid("as"),
        name: `reference-${index + 1}`,
        url,
        category: "other",
        createdAt,
      })),
      ...p.assets,
    ];
  }
  return p;
}

export { TYPE_TO_KIND };

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
  if (draft.primaryColor?.trim()) p.explicitBrandColor = draft.primaryColor.trim();

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
  primaryColor: "#253FDA",
  secondaryColor: "#111114",
  style: "auto",
  generationMode: "smart",
  category: "generic",
});
