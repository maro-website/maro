/**
 * maro.al ↔ maro-final-design-system bridge.
 * Source of truth: maro-final-design-system/tokens/maro-final.css
 *
 * Intentional exceptions (documented):
 * 1. Website preview editor uses separate theme tokens (generated sites, not app shell).
 * 2. Existing Tailwind aliases (--canvas, --ink, …) are a compatibility bridge only.
 */

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
