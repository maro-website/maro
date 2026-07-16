import type { Project, WizardDraft, Asset } from "@/lib/types";
import { makeProject } from "@/lib/mock/demo";
import { uid } from "@/lib/utils/format";

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
