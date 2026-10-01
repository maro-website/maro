/**
 * maro.al ↔ maro-final-design-system bridge.
 * Source of truth: maro-final-design-system/tokens/maro-final.css
 *
 * Intentional exceptions (documented):
 * 1. Website preview editor uses separate theme tokens (generated sites, not app shell).
 * 2. Existing Tailwind aliases (--canvas, --ink, …) are a compatibility bridge only.
 */

import { resolveProductModule, type ProductModuleId } from "@/lib/modules/availability";

export interface MaroProductBrand {
  id: string;
  moduleId: ProductModuleId;
  name: string;
  displayName: string;
  color: string;
  /** Artwork names, not theme names: dark text belongs on a light surface. */
  horizontal: { dark: string; light: string };
  /** Single-color artwork, rendered with the existing currentColor mask. */
  symbol: { dark: string; light: string };
  /** Full-color standalone symbol with its official circular background. */
  icon: string;
}

function productBrand(id: string, moduleId: ProductModuleId, color: string): MaroProductBrand {
  return {
    id,
    moduleId,
    name: id,
    displayName: id,
    color,
    horizontal: {
      dark: `/new-logos/${id}-horizontal-logo-dark.svg`,
      light: `/new-logos/${id}-horizontal-logo-light.svg`,
    },
    // Only one iconSingle artwork exists; the mask supplies surface contrast.
    symbol: {
      dark: `/new-logos/${id}-iconSingle.svg`,
      light: `/new-logos/${id}-iconSingle.svg`,
    },
    icon: `/new-logos/${id}-icon.svg`,
  };
}

/** Final product identity only. Registration never enables or exposes a product. */
export const MARO_PRODUCTS = {
  maroImazh: productBrand("maroImazh", "imazh", "#00E7FF"),
  maroLogo: productBrand("maroLogo", "logo", "#ADFF00"),
  maroWeb: productBrand("maroWeb", "web", "#00A0FF"),
  maroFilma: productBrand("maroFilma", "filma", "#9800FF"),
  maroAudio: productBrand("maroAudio", "audio", "#F1F1F1"),
  maroMarketing: productBrand("maroMarketing", "marketing", "#FF0000"),
  // Metadata only: maroFort UI, permissions and functionality remain unchanged.
  maroFort: productBrand("maroFort", "fort", "#FF6C00"),
  maroBrain: productBrand("maroBrain", "brain", "#FF1ECD"),
  maroPresets: productBrand("maroPresets", "presets", "#FFFF00"),
} as const;

export type MaroProductId = keyof typeof MARO_PRODUCTS;

/** Reuse existing module aliases; do not rename generation/tool IDs. */
export function getProductBrand(value: string): MaroProductBrand | undefined {
  const moduleId = resolveProductModule(value);
  return Object.values(MARO_PRODUCTS).find((brand) => brand.moduleId === moduleId);
}

/** Official runtime logo assets. */
export const MARO_LOGO = {
  lockup: "/brand/maro-logo.svg",
  symbol: "/brand/maro-symbol.svg",
  symbolWhite: "/brand/maro-symbol-white.svg",
  partnerNice: "/brand/nice-logo-white.svg",
} as const;

/** Canonical runtime icon library. */
export const MARO_ICONS = {
  base: "/icons",
  manifest: "/icons/manifest.json",
} as const;

/** Figma tracking -30 → CSS -0.03em (never -30px). */
export const MARO_TRACKING = {
  brand: "-0.03em",
  body: "-0.03em",
  code: "0",
} as const;

/** Product shell geometry from maro-final tokens. */
export const MARO_SHELL = {
  headerHeight: "var(--maro-shell-header-height)",
  footerHeight: "var(--maro-shell-footer-height)",
  sidebarWidth: "var(--maro-shell-sidebar-width)",
  contentMax: "var(--maro-shell-content-max)",
  gutter: "var(--maro-shell-gutter)",
} as const;

/** Semantic CSS variable names for programmatic theming. */
export const MARO_COLOR = {
  bgCanvas: "var(--maro-color-bg-canvas)",
  bgSurface: "var(--maro-color-bg-surface)",
  bgInverse: "var(--maro-color-bg-inverse)",
  bgSelected: "var(--maro-color-bg-selected)",
  bgDanger: "var(--maro-color-bg-danger)",
  textPrimary: "var(--maro-color-text-primary)",
  textSecondary: "var(--maro-color-text-secondary)",
  textTertiary: "var(--maro-color-text-tertiary)",
  textBrand: "var(--maro-color-text-brand)",
  textDanger: "var(--maro-color-text-danger)",
  borderSubtle: "var(--maro-color-border-subtle)",
  borderFocus: "var(--maro-color-border-focus)",
} as const;
