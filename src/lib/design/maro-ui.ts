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
    canvas: "#d4fff4",
    surface: "#ffffff",
    surface2: "#f8f8f8",
    muted: "#d7d7d7",
    teal: "#00fdba",
    forest: "#00392a",
    ink: "#111111",
    inkMuted: "#818181",
  },
  dark: {
    canvas: "#111111",
    surface: "#0a0a0a",
    surface2: "#262626",
    muted: "#d7d7d7",
    teal: "#00fdba",
    forest: "#00392a",
    inkMuted: "#818181",
    menuHover: "#323232",
  },
} as const;

export const BRAND = {
  teal: "#00fdba",
  forest: "#00392a",
  muted: "#d7d7d7",
  red: "#ff0000",
  canvasDark: "#111111",
  surfaceDark: "#0a0a0a",
  surface2Dark: "#262626",
} as const;
