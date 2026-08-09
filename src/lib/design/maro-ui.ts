/** Shared Figma sizing — keep buttons, icons, and radii consistent. */
export const UI = {
  sidebarWidth: 280,
  btnH: 44,
  btnHLg: 52,
  iconSm: 20,
  iconMd: 22,
  iconLg: 28,
  iconXL: 36,
  radiusCard: 16,
  radiusDock: 28,
  radiusPill: 9999,
  textSm: 14,
  textBase: 16,
  textLg: 18,
  textXL: 22,
} as const;

/** Brand hex palette — authoritative Figma handoff (do not approximate). */
export const BRAND_PALETTE = {
  light: {
    canvas: "#f5f5f5",
    surface: "#ffffff",
    surface2: "#efefef",
    muted: "#c7c7c7",
    brand: "#253fda",
    ink: "#111111",
    inkMuted: "#c7c7c7",
  },
  dark: {
    canvas: "#111111",
    surface: "#ffffff",
    surface2: "#efefef",
    muted: "#c7c7c7",
    brand: "#253fda",
    inkMuted: "#c7c7c7",
    menuHover: "#f5f5f5",
  },
} as const;

export const BRAND = {
  primary: "#253fda",
  ink: "#111111",
  canvas: "#f5f5f5",
  muted: "#c7c7c7",
  white: "#ffffff",
  red: "#ff0000",
  /** @deprecated use primary */
  teal: "#253fda",
  /** @deprecated use ink */
  forest: "#111111",
  canvasDark: "#111111",
  surfaceDark: "#ffffff",
  surface2Dark: "#efefef",
} as const;
