/**
 * Figma sizing mirror — values come from maro-design-system/tokens/maro.css.
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

/** @deprecated Use MARO_COLOR / CSS vars. Kept for gradual migration. */
export const BRAND_PALETTE = {
  light: {
    canvas: "#f5f5f5",
    surface: "#ffffff",
    surface2: "#f5f5f5",
    muted: "#c7c7c7",
    brand: "#253fda",
    ink: "#111111",
    inkMuted: "#818181",
  },
  dark: {
    canvas: "#111111",
    surface: "#ffffff",
    surface2: "#f5f5f5",
    muted: "#c7c7c7",
    brand: "#253fda",
    inkMuted: "#818181",
    menuHover: "#f5f5f5",
  },
} as const;

/** @deprecated Use semantic --maro-* tokens. */
export const BRAND = {
  primary: "#253fda",
  ink: "#111111",
  canvas: "#f5f5f5",
  muted: "#c7c7c7",
  secondary: "#818181",
  white: "#ffffff",
  red: "#da2525",
  teal: "#253fda",
  forest: "#111111",
  canvasDark: "#111111",
  surfaceDark: "#ffffff",
  surface2Dark: "#f5f5f5",
} as const;
