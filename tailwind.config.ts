import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Legacy app aliases (see src/styles/maro-compat.css)
        brand: {
          DEFAULT: "var(--brand)",
          hover: "var(--brand-hover)",
          soft: "var(--brand-soft)",
          fg: "var(--brand-fg)",
        },
        canvas: "var(--canvas)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        "ink-3": "var(--ink-3)",
        "ink-inv": "var(--ink-inv)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        info: "var(--info)",
        overlay: "var(--overlay)",
        scrim: "var(--scrim)",
        dim: "var(--dim)",
        "on-scrim": "var(--on-scrim)",
        "c-blue": "var(--c-blue)",
        "c-teal": "var(--c-teal)",
        "c-red": "var(--c-red)",
        "c-pale": "var(--c-pale)",
        "c-yellow": "var(--c-yellow)",
        "accent-teal": "var(--accent-teal)",
        "sidebar-card": "var(--sidebar-card)",
        "prompt-dock": "var(--prompt-dock)",
        "dock-btn": "var(--dock-btn)",
        "fort-pill": "var(--fort-pill)",
        "dock-tool": "var(--dock-tool-btn)",
        "dock-tool-fg": "var(--dock-tool-fg)",
        generate: {
          DEFAULT: "var(--generate-bg)",
          fg: "var(--generate-fg)",
        },
        // Canonical maro semantic tokens (prefer for new code)
        maro: {
          canvas: "var(--maro-color-bg-canvas)",
          surface: "var(--maro-color-bg-surface)",
          inverse: "var(--maro-color-bg-inverse)",
          selected: "var(--maro-color-bg-selected)",
          danger: "var(--maro-color-bg-danger)",
          "text-primary": "var(--maro-color-text-primary)",
          "text-secondary": "var(--maro-color-text-secondary)",
          "text-tertiary": "var(--maro-color-text-tertiary)",
          brand: "var(--maro-color-text-brand)",
          "text-danger": "var(--maro-color-text-danger)",
          "border-subtle": "var(--maro-color-border-subtle)",
          "border-focus": "var(--maro-color-border-focus)",
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
        xl: "0.875rem",
        "2xl": "1.125rem",
        "3xl": "1.5rem",
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
        "fade-in": "fade-in 0.3s ease-out forwards",
        "fade-up": "fade-up 0.4s cubic-bezier(0.22,1,0.36,1) forwards",
        "scale-in": "scale-in 0.2s cubic-bezier(0.22,1,0.36,1) forwards",
        "slide-in-right": "slide-in-right 0.3s cubic-bezier(0.22,1,0.36,1) forwards",
        "pulse-soft": "pulse-soft 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
