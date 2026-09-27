import type { FontKey, Theme, ButtonStyle } from "@/lib/types";

export const FONT_STACK: Record<FontKey, string> = {
  Inter: "Inter, system-ui, sans-serif",
  Manrope: "Manrope, system-ui, sans-serif",
  "DM Sans": "'DM Sans Variable', system-ui, sans-serif",
  "Space Grotesk": "'Space Grotesk Variable', system-ui, sans-serif",
  "Playfair Display": "'Playfair Display', Georgia, serif",
  "Instrument Serif": "'Instrument Serif', Georgia, serif",
  "Plus Jakarta Sans": "'Plus Jakarta Sans Variable', sans-serif",
};

export const FONT_OPTIONS: FontKey[] = [
  "Inter",
  "Manrope",
  "DM Sans",
  "Space Grotesk",
  "Playfair Display",
  "Instrument Serif",
];

export function previewVars(theme: Theme): React.CSSProperties {
  return {
    // scoped CSS variables consumed by the section renderers
    ["--p" as string]: theme.primaryColor,
    ["--s" as string]: theme.secondaryColor,
    ["--bg" as string]: theme.backgroundColor,
    ["--tx" as string]: theme.textColor,
    ["--muted" as string]: theme.dark
      ? "rgba(255,255,255,0.62)"
      : "rgba(16,16,24,0.60)",
    ["--card" as string]: theme.dark ? "rgba(255,255,255,0.05)" : "#ffffff",
    ["--line" as string]: theme.dark
      ? "rgba(255,255,255,0.12)"
      : "rgba(16,16,24,0.10)",
    ["--rad" as string]: `${theme.radius}px`,
    ["--hf" as string]: FONT_STACK[theme.headingFont],
    ["--bf" as string]: FONT_STACK[theme.bodyFont],
    backgroundColor: theme.backgroundColor,
    color: theme.textColor,
    fontFamily: FONT_STACK[theme.bodyFont],
  };
}

export function buttonStyle(
  style: ButtonStyle,
  variant: "primary" | "secondary",
  theme: Theme
): React.CSSProperties {
  const radius =
    style === "pill" ? 999 : Math.max(theme.radius, 6);
  const base: React.CSSProperties = {
    borderRadius: radius,
    fontWeight: 600,
    fontSize: 14,
    padding: "12px 22px",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    transition: "all .15s ease",
    fontFamily: "var(--bf)",
    lineHeight: 1,
  };
  const primaryColor = theme.primaryColor;
  if (variant === "primary") {
    if (style === "outline")
      return { ...base, border: `1.5px solid ${primaryColor}`, color: primaryColor, background: "transparent" };
    if (style === "soft")
      return { ...base, background: `${primaryColor}1a`, color: primaryColor };
    return { ...base, background: primaryColor, color: "#fff" };
  }
  // secondary
  return {
    ...base,
    background: "transparent",
    color: "var(--tx)",
    border: `1.5px solid var(--line)`,
  };
}
