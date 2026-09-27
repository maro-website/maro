import type { WebsiteCategory, WebsiteSection } from "@/lib/types";
import type { AiSection } from "./types";
import { genImage } from "@/lib/mock/images";

// The model returns empty strings/arrays for image fields (see prompts.ts). This
// fills them with deterministic, fully-local artwork so nothing hits the network.
// Existing data-URI values are preserved so edits don't churn imagery.

function isFilled(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function pic(seed: string, category: string, w: number, h: number, variant?: number) {
  return genImage({ seed, category, w, h, variant });
}

export function hydrateSectionImages(
  sections: AiSection[],
  category: WebsiteCategory,
  seedBase: string
): WebsiteSection[] {
  return sections.map((s, si) => {
    const data: Record<string, unknown> = { ...s.data };
    const seed = `${seedBase}-${s.kind}-${si}`;

    switch (s.kind) {
      case "hero":
        if (!isFilled(data.image)) data.image = pic(seed, category, 1100, 850, 0);
        break;
      case "about":
        if (!isFilled(data.image)) data.image = pic(seed, category, 800, 900, 1);
        break;
      case "gallery": {
        const imgs = Array.isArray(data.images) ? (data.images as unknown[]) : [];
        const filled = imgs.filter(isFilled);
        const target = Math.max(4, filled.length);
        data.images = Array.from({ length: target }, (_, n) =>
          isFilled(imgs[n]) ? imgs[n] : pic(`${seed}-${n}`, category, 600, 600, n % 3)
        );
        break;
      }
      case "work": {
        const items = Array.isArray(data.items) ? (data.items as Record<string, unknown>[]) : [];
        data.items = items.map((it, n) => ({
          ...it,
          image: isFilled(it.image) ? it.image : pic(`${seed}-${n}`, category, 800, 640, n % 3),
        }));
        break;
      }
      case "team": {
        const members = Array.isArray(data.members)
          ? (data.members as Record<string, unknown>[])
          : [];
        data.members = members.map((m, n) => ({
          ...m,
          avatar: isFilled(m.avatar) ? m.avatar : pic(`${seed}-${n}`, category, 400, 400, n),
        }));
        break;
      }
      default:
        break;
    }

    return { id: s.id ?? "", kind: s.kind, data };
  });
}
