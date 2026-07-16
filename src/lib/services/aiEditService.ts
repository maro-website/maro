import type { Project, WebsiteSection } from "@/lib/types";
import { uid, slugify } from "@/lib/utils/format";
import type { AiEditRequest, AiEditResponse } from "@/lib/ai/types";
import { normalizeSections, normalizeTheme } from "@/lib/ai/normalize";

export interface AiEditResult {
  response: string;
  cost: number;
  versionLabel: string;
  mutate: (p: Project) => Project;
}

// Real AI edit powered by Claude Opus 4.8 (via /api/ai/edit). Throws on any
// failure (no key, network, bad output) so the caller can fall back to the
// local mock interpreter and the editor keeps working offline.
export async function requestAiEdit(prompt: string, project: Project): Promise<AiEditResult> {
  const page =
    project.pages.find((p) => p.id === project.activePageId) ?? project.pages[0];
  if (!page) throw new Error("no-active-page");

  const req: AiEditRequest = {
    instruction: prompt,
    businessName: project.businessName,
    category: project.category,
    language: project.language,
    theme: project.theme,
    page: { id: page.id, name: page.name, sections: page.sections },
    assetUrls: project.assets
      .filter((a) => a.category !== "logo")
      .map((a) => a.url)
      .slice(0, 8),
  };

  const res = await fetch("/api/ai/edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`ai-edit-http-${res.status}`);

  const data = (await res.json()) as AiEditResponse;

  const themePatch =
    data.theme && Object.keys(data.theme).length ? normalizeTheme(data.theme) : undefined;
  const seedBase = slugify(project.businessName) || "site";
  const sections =
    data.sections && data.sections.length
      ? normalizeSections(data.sections, page.sections, project.category, seedBase)
      : undefined;

  if (!themePatch && !(sections && sections.length)) {
    // Nothing usable came back — treat as a failure so we fall back gracefully.
    throw new Error("ai-edit-empty");
  }

  const cost = Number.isFinite(data.cost)
    ? Math.max(0, Math.min(20, Math.round(data.cost)))
    : 5;

  return {
    response: data.reply?.trim() || "Ndryshimet u krynë.",
    versionLabel: data.versionLabel?.trim() || "Ndryshim me AI",
    cost,
    mutate: (p) => {
      let next = p;
      if (themePatch) {
        next = {
          ...next,
          theme: { ...next.theme, ...themePatch },
          brand: {
            ...next.brand,
            primaryColor: themePatch.primaryColor ?? next.brand.primaryColor,
            secondaryColor: themePatch.secondaryColor ?? next.brand.secondaryColor,
            backgroundColor: themePatch.backgroundColor ?? next.brand.backgroundColor,
            textColor: themePatch.textColor ?? next.brand.textColor,
          },
        };
      }
      if (sections && sections.length) {
        next = {
          ...next,
          pages: next.pages.map((pg) =>
            pg.id === page.id ? { ...pg, sections } : pg
          ),
        };
      }
      return next;
    },
  };
}

function replaceHomeSections(
  p: Project,
  fn: (sections: WebsiteSection[]) => WebsiteSection[]
): Project {
  const pages = p.pages.map((page) =>
    page.slug === "home" || page === p.pages[0]
      ? { ...page, sections: fn(page.sections) }
      : page
  );
  return { ...p, pages };
}

const HERO_TITLES = [
  "We build brands people remember.",
  "Design that moves your business forward.",
  "Bold ideas, crafted with precision.",
  "Your vision, beautifully built.",
];

export function interpretPrompt(prompt: string): AiEditResult {
  const t = prompt.toLowerCase();
  const has = (...w: string[]) => w.some((x) => t.includes(x));

  if (has("dark", "errët", "erret", "natë", "nate")) {
    return {
      response: "Ndryshimet u krynë. E ktheva website-in në një skemë të errët elegante.",
      cost: 5,
      versionLabel: "Kalova në temë të errët",
      mutate: (p) => {
        const dark = !p.theme.dark;
        return {
          ...p,
          theme: {
            ...p.theme,
            dark,
            backgroundColor: dark ? "#0d0d12" : "#ffffff",
            textColor: dark ? "#f4f4f6" : "#101014",
          },
        };
      },
    };
  }

  if (has("premium", "luks", "elegant", "elegante")) {
    return {
      response: "Ndryshimet u krynë. E ngrita nivelin premium — tipografi elegante dhe hapësirë më e ajrosur.",
      cost: 5,
      versionLabel: "E bëra hero-n më premium",
      mutate: (p) => ({
        ...p,
        theme: {
          ...p.theme,
          radius: 2,
          buttonStyle: "solid",
          headingFont: "Playfair Display",
        },
      }),
    };
  }

  if (has("minimal", "pastër", "paster", "clean")) {
    return {
      response: "Ndryshimet u krynë. E bëra website-in më minimal — më pak zhurmë, më shumë frymëmarrje.",
      cost: 5,
      versionLabel: "E bëra website-in më minimal",
      mutate: (p) => ({
        ...p,
        theme: { ...p.theme, radius: 4, buttonStyle: "outline", headingFont: "Manrope" },
      }),
    };
  }

  if (has("button", "buton", "butonat")) {
    const order: Project["theme"]["buttonStyle"][] = ["solid", "outline", "soft", "pill"];
    return {
      response: "Ndryshimet u krynë. Ndryshova stilin e butonave.",
      cost: 5,
      versionLabel: "Ndryshova stilin e butonave",
      mutate: (p) => {
        const next = order[(order.indexOf(p.theme.buttonStyle) + 1) % order.length];
        return { ...p, theme: { ...p.theme, buttonStyle: next } };
      },
    };
  }

  if (has("hero")) {
    return {
      response: "Ndryshimet u krynë. Ndryshova variantin e hero-s me një titull të ri më të fuqishëm.",
      cost: 5,
      versionLabel: "Ndryshova hero-n",
      mutate: (p) =>
        replaceHomeSections(p, (secs) =>
          secs.map((s) => {
            if (s.kind !== "hero") return s;
            const current = String(s.data.title ?? "");
            const next = HERO_TITLES.find((x) => x !== current) ?? HERO_TITLES[0];
            return { ...s, data: { ...s.data, title: next } };
          })
        ),
    };
  }

  if (has("pricing", "çmim", "cmim", "plane", "plan")) {
    return {
      response: "Ndryshimet u krynë. Shtova një pricing section me tri plane.",
      cost: 10,
      versionLabel: "Shtova pricing section",
      mutate: (p) =>
        replaceHomeSections(p, (secs) => {
          if (secs.some((s) => s.kind === "pricing")) return secs;
          const pricing: WebsiteSection = {
            id: uid("sec"),
            kind: "pricing",
            data: {
              title: "Planet",
              subtitle: "Zgjidh planin që të përshtatet.",
              plans: [
                { name: "Starter", price: "€0", period: "/muaj", features: ["1 website", "Subdomain maro.al", "Mbështetje bazë"], featured: false },
                { name: "Growth", price: "€19", period: "/muaj", features: ["3 website", "Domain i personalizuar", "Analytics", "Mbështetje prioritare"], featured: true },
                { name: "Business", price: "€49", period: "/muaj", features: ["Website të pakufizuar", "Ekip", "SEO i avancuar", "Mbështetje 24/7"], featured: false },
              ],
            },
          };
          const idx = Math.max(0, secs.findIndex((s) => s.kind === "cta"));
          const copy = [...secs];
          copy.splice(idx, 0, pricing);
          return copy;
        }),
    };
  }

  return {
    response: "E kuptova. I aplikova disa përmirësime të vogla në website. Trego më shumë nëse dëshiron diçka specifike.",
    cost: 5,
    versionLabel: "Rregullime të vogla",
    mutate: (p) => ({ ...p }),
  };
}
