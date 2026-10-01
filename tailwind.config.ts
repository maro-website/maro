import type { Config } from "tailwindcss";

// CSS-variable colors also support Tailwind opacity utilities in both themes.
const semanticColor = (name: string) =>
  `color-mix(in srgb, var(${name}) calc(<alpha-value> * 100%), transparent)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Compatibility aliases backed by maro-final-design-system.
        brand: {
          DEFAULT: semanticColor("--brand"),
          hover: semanticColor("--brand-hover"),
          active: semanticColor("--maro-color-accent-active"),
          soft: semanticColor("--brand-soft"),
          fg: semanticColor("--brand-fg"),
        },
        canvas: semanticColor("--canvas"),
        surface: semanticColor("--surface"),
        "surface-01": semanticColor("--surface-01"),
        "surface-2": semanticColor("--surface-2"),
        "surface-02": semanticColor("--surface-02"),
        "surface-hover": semanticColor("--surface-hover"),
        "surface-selected": semanticColor("--surface-selected"),
        line: semanticColor("--line"),
        "line-strong": semanticColor("--line-strong"),
        ink: semanticColor("--ink"),
        "ink-2": semanticColor("--ink-2"),
        "ink-3": semanticColor("--ink-3"),
        "ink-inv": semanticColor("--ink-inv"),
        success: semanticColor("--success"),
        warning: semanticColor("--warning"),
        danger: semanticColor("--danger"),
        info: semanticColor("--info"),
        overlay: semanticColor("--overlay"),
        scrim: semanticColor("--scrim"),
        dim: semanticColor("--dim"),
        "on-scrim": semanticColor("--on-scrim"),
        "c-blue": semanticColor("--c-blue"),
        "c-teal": semanticColor("--c-teal"),
        "c-red": semanticColor("--c-red"),
        "c-pale": semanticColor("--c-pale"),
        "c-yellow": semanticColor("--c-yellow"),
        "accent-teal": semanticColor("--accent-teal"),
        "sidebar-card": semanticColor("--sidebar-card"),
        "prompt-dock": semanticColor("--prompt-dock"),
        "dock-btn": semanticColor("--dock-btn"),
        "fort-pill": semanticColor("--fort-pill"),
        "dock-tool": semanticColor("--dock-tool-btn"),
        "dock-tool-fg": semanticColor("--dock-tool-fg"),
        generate: {
          DEFAULT: semanticColor("--generate-bg"),
          fg: semanticColor("--generate-fg"),
        },
        // Canonical maro-final semantic tokens (prefer for new code)
        maro: {
          canvas: semanticColor("--maro-color-bg-canvas"),
          surface: semanticColor("--maro-color-bg-surface"),
          raised: semanticColor("--maro-color-bg-surface-raised"),
          subtle: semanticColor("--maro-color-bg-subtle"),
          inverse: semanticColor("--maro-color-bg-inverse"),
          selected: semanticColor("--maro-color-bg-selected"),
          danger: semanticColor("--maro-color-bg-danger"),
          "text-primary": semanticColor("--maro-color-text-primary"),
          "text-secondary": semanticColor("--maro-color-text-secondary"),
          "text-tertiary": semanticColor("--maro-color-text-tertiary"),
          "text-muted": semanticColor("--maro-color-text-muted"),
          "text-disabled": semanticColor("--maro-color-text-disabled"),
          brand: semanticColor("--maro-color-text-brand"),
          "text-danger": semanticColor("--maro-color-text-danger"),
          "border-subtle": semanticColor("--maro-color-border-subtle"),
          "border-default": semanticColor("--maro-color-border-default"),
          "border-interactive": semanticColor("--maro-color-border-interactive"),
          "border-focus": semanticColor("--maro-color-border-focus"),
        },
      },
      fontFamily: {
        sans: ["var(--maro-font-family)", "system-ui", "sans-serif"],
        jakarta: ['"Plus Jakarta Sans Variable"', "Plus Jakarta Sans", "sans-serif"],
        inter: ["Inter", "system-ui", "sans-serif"],
        manrope: ["Manrope", "system-ui", "sans-serif"],
        dmsans: ['"DM Sans Variable"', "system-ui", "sans-serif"],
        grotesk: ['"Space Grotesk Variable"', "system-ui", "sans-serif"],
        playfair: ['"Playfair Display"', "Georgia", "serif"],
        instrument: ['"Instrument Serif"', "Georgia", "serif"],
      },
      letterSpacing: {
        brand: "var(--maro-tracking-brand)",
        body: "var(--maro-tracking-body)",
      },
      borderRadius: {
        maro8: "var(--maro-radius-8)",
        maro12: "var(--maro-radius-12)",
        maro16: "var(--maro-radius-16)",
        maro20: "var(--maro-radius-20)",
        maro24: "var(--maro-radius-24)",
        maro32: "var(--maro-radius-32)",
        lg: "var(--maro-radius-12)",
        xl: "var(--maro-radius-16)",
        "2xl": "var(--maro-radius-20)",
        "3xl": "var(--maro-radius-24)",
      },
      boxShadow: {
        float: "var(--maro-shadow-float)",
        overlay: "var(--maro-shadow-overlay)",
        subtle: "none",
        card: "none",
        pop: "none",
        brand: "none",
      },
      transitionDuration: {
        instant: "var(--maro-duration-instant)",
        fast: "var(--maro-duration-fast)",
        normal: "var(--maro-duration-normal)",
        slow: "var(--maro-duration-slow)",
      },
      transitionTimingFunction: {
        maro: "var(--maro-ease-standard)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(12px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "fade-in": "fade-in var(--maro-duration-normal) var(--maro-ease-standard) forwards",
        "fade-up": "fade-up var(--maro-duration-normal) var(--maro-ease-standard) forwards",
        "scale-in": "scale-in var(--maro-duration-normal) var(--maro-ease-standard) forwards",
        "slide-in-right": "slide-in-right var(--maro-duration-normal) var(--maro-ease-standard) forwards",
        "pulse-soft": "pulse-soft 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
