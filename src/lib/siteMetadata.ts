import type { Metadata } from "next";

export const PAGE_PATH_HEADER = "x-maro-page-path";
export const SITE_ORIGIN = "https://maro.al";
export const SITE_DESCRIPTION = "Krijo imazhe dhe logo me AI. Përshkruaj çka do dhe maro e maron.";
export const SOCIAL_SHARE_IMAGE = { url: "/social-share-thumbnail.png", width: 1200, height: 630, alt: "maro diçka sot — Provoje tash në maro.al" };

/** Page names only: never put chat prompts, account details or URL query tokens in metadata. */
export const PAGE_TITLES: Readonly<Record<string, string>> = {
  "/": "Hub", "/hub-vision": "Hub", "/coming-soon": "Së shpejti",
  "/imazh": "maroImazh", "/marologo": "maroLogo", "/logo": "maroLogo", "/brand": "maroLogo",
  "/web": "maroWeb", "/new": "Projekt i ri", "/filma": "maroFilma", "/audio": "maroAudio", "/zo": "maroAudio",
  "/marketing": "maroMarketing", "/fjale": "maroFjalë", "/brain": "maroBrain", "/presets": "maroPresets",
  "/explore": "Explore", "/krijimet": "Krijimet e mia", "/favourites": "Të preferuarat", "/dashboard": "Paneli im",
  "/moods": "maroMoods", "/admin/engine/moods": "Admin · maroMoods",
  "/feed": "maroFeed", "/admin/engine/feed": "Admin · maroFeed",
  "/account": "Llogaria ime", "/account/workspaces": "Hapësirat e punës",
  "/pricing": "Planet dhe kreditet", "/bonus": "Merr kredite falas", "/kreator": "maroKreator",
  "/academy": "maroAcademy", "/case-studies": "Rastet e përdorimit", "/contests": "Garat", "/contact": "Kontakt",
  "/sign-in": "Hyr", "/sign-up": "Regjistrohu", "/forgot-password": "Ke harruar fjalëkalimin",
  "/reset-password": "Ndrysho fjalëkalimin", "/confirm-email": "Konfirmo email-in", "/oauth/consent": "Autorizimi",
  "/mcp": "Integrimet", "/checkout": "Pagesa", "/order/success": "Pagesa u përfundua", "/order/cancel": "Pagesa u anulua",
  "/pay/raiaccept/return": "Konfirmimi i pagesës", "/pay/redirect": "Vazhdo te pagesa", "/pay/test": "Testimi i pagesës",
  "/legal/terms": "Kushtet e Përdorimit", "/legal/privacy": "Politika e Privatësisë",
  "/legal/refund": "Politika e Rimbursimit", "/legal/cookies": "Politika e Cookies", "/legal/fair-use": "Përdorimi i drejtë",
  "/admin": "Admin", "/admin/users": "Admin · Përdoruesit", "/admin/freebies": "Admin · Freebies",
  "/admin/access": "Admin · Rolet dhe lejet", "/admin/creators": "Admin · Kreatorët", "/admin/mfa": "Admin · MFA",
  "/admin/engine": "Admin · Mjetet", "/admin/engine/brain": "Admin · maroBrain", "/admin/engine/generations": "Admin · Gjenerimet",
  "/admin/engine/presets": "Admin · maroPresets", "/admin/prompts": "Admin · Presetet", "/admin/presets/categories": "Admin · Kategoritë e preseteve",
  "/admin/notifications": "Admin · Njoftimet", "/admin/login-ads": "Admin · Reklamat e hyrjes", "/admin/emails": "Admin · Emailat", "/admin/help": "Admin · Qendra e ndihmës",
  "/admin/commerce": "Admin · Tregtia", "/admin/commerce/plans": "Admin · Planet", "/admin/commerce/topups": "Admin · Top-ups",
  "/admin/commerce/business": "Admin · Business", "/admin/commerce/payments": "Admin · Pagesat", "/admin/commerce/promos": "Admin · Kodet Promo",
  "/admin/commerce/creators": "Admin · Fitimet e kreatorëve", "/admin/commerce/ledger": "Admin · Libri i krediteve",
  "/admin/support": "Admin · Tiketat", "/admin/support/reports": "Admin · Raportet e gjenerimit", "/admin/analytics": "Admin · Analitika",
  "/admin/analytics/presets": "Admin · Statistikat e preseteve", "/admin/operations/audit": "Admin · Historiku i veprimeve",
  "/admin/operations/logs": "Admin · Log-et e sistemit", "/admin/operations/security": "Admin · Siguria dhe kostot",
  "/admin/operations/flags": "Admin · Konfigurimi", "/admin/operations/retention": "Admin · Ruajtja e të dhënave",
  "/admin/security": "Admin · Siguria", "/admin/legacy": "Admin · Arkivi",
};

export function pageName(pathname: string): string {
  const path = pathname.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  if (PAGE_TITLES[path]) return PAGE_TITLES[path];
  if (/^\/account\/workspaces\/[^/]+$/.test(path)) return "Cilësimet e hapësirës";
  if (/^\/admin\/engine\/generations\/[^/]+\/image$/.test(path)) return "Admin · Origjinali i gjenerimit";
  if (/^\/admin\/engine\/tools\/[^/]+$/.test(path)) {
    return ({ maro_imazh: "Admin · maroImazh", maro_logo: "Admin · maroLogo" } as Record<string, string>)[path.split("/").at(-1)!] ?? "Admin · Konfigurimi i mjetit";
  }
  if (/^\/projects\/[^/]+(?:\/(editor|generating|preview|settings))?$/.test(path)) {
    return ({ editor: "Edito projektin", generating: "Projekti po marohet", preview: "Pamja e projektit", settings: "Cilësimet e projektit" } as Record<string, string>)[path.split("/")[3]] ?? "Projekti";
  }
  if (/^\/c\/[^/]+$/.test(path)) return "Publikim në Explore";
  if (/^\/r\/[^/]+$/.test(path)) return "Ofertë";
  if (/^\/u\/[^/]+$/.test(path)) return "Profili";
  if (/^\/contests\/[^/]+$/.test(path)) return "Gara";
  return "Faqja nuk u gjet";
}

export function metadataForPage(pathname: string): Metadata {
  const title = `maro.al - ${pageName(pathname)}`;
  return {
    metadataBase: new URL(SITE_ORIGIN), applicationName: "maro", title, description: SITE_DESCRIPTION,
    icons: {
      icon: [{ url: "/favicon.svg", type: "image/svg+xml", sizes: "any" }, { url: "/favicon.ico", sizes: "16x16 32x32 48x48" }],
      shortcut: "/favicon.ico",
      apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
    },
    manifest: "/manifest.webmanifest",
    ...(["/moods", "/feed"].includes(pathname.split(/[?#]/, 1)[0]) ? { robots: { index: false, follow: false } } : {}),
    openGraph: { type: "website", siteName: "maro.al", locale: "sq_AL", title, description: SITE_DESCRIPTION, images: [SOCIAL_SHARE_IMAGE] },
    twitter: { card: "summary_large_image", title, description: SITE_DESCRIPTION, images: [SOCIAL_SHARE_IMAGE.url] },
  };
}
