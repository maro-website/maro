/**
 * Figma sizing mirror — values come from maro-final-design-system/tokens/maro-final.css.
 * Prefer CSS variables in components; use these only when JS needs numbers.
 */
import { MARO_SHELL, MARO_TRACKING } from "@/lib/design/maro-system";

export const UI = {
  sidebarWidth: 280,
  btnH: 40,
  btnHLg: 48,
  iconSm: 16,
  iconMd: 20,
  iconLg: 24,
  iconXL: 32,
  radiusCard: 16,
  radiusDock: 20,
  radiusPill: 999,
  textSm: 14,
  textBase: 16,
  textLg: 18,
  textXL: 20,
  trackingBrand: MARO_TRACKING.brand,
  trackingBody: MARO_TRACKING.body,
  shell: MARO_SHELL,
} as const;

/** @deprecated Use MARO_COLOR / CSS vars. Kept only for compatibility. */
export const BRAND_PALETTE = {
  light: {
    canvas: "#f9f9f9",
    surface: "#ffffff",
    surface2: "#f3f3f3",
    muted: "#8a8a8a",
    brand: "#253fda",
    ink: "#0a0a0a",
    inkMuted: "#5f5f5f",
  },
} as const;

/** @deprecated Use semantic --maro-* tokens. */
export const BRAND = {
  primary: "#253fda",
  ink: "#0a0a0a",
  canvas: "#f9f9f9",
  muted: "#8a8a8a",
  secondary: "#5f5f5f",
  white: "#ffffff",
  red: "#da2525",
  teal: "#253fda",
  forest: "#0a0a0a",
} as const;
