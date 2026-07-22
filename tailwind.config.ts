import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Centralized Maro brand tokens (see globals.css :root)
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
        // Brand accent palette (logo shapes)
        "c-blue": "var(--c-blue)",
        "c-teal": "var(--c-teal)",
        "c-red": "var(--c-red)",
        "c-pale": "var(--c-pale)",
        "c-yellow": "var(--c-yellow)",
      },
      fontFamily: {
        sans: ["var(--font-app)", "system-ui", "sans-serif"],
        // Website-preview fonts (selectable inside the editor)
        jakarta: ["var(--font-app)", "sans-serif"],
        inter: ["Inter", "system-ui", "sans-serif"],
        manrope: ["Manrope", "system-ui", "sans-serif"],
        dmsans: ['"DM Sans Variable"', "system-ui", "sans-serif"],
        grotesk: ['"Space Grotesk Variable"', "system-ui", "sans-serif"],
        playfair: ['"Playfair Display"', "Georgia", "serif"],
        instrument: ['"Instrument Serif"', "Georgia", "serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgb(16 16 24 / 0.04), 0 1px 1px 0 rgb(16 16 24 / 0.03)",
        card: "0 1px 3px 0 rgb(16 16 24 / 0.06), 0 1px 2px -1px rgb(16 16 24 / 0.05)",
        pop: "0 10px 30px -12px rgb(16 16 24 / 0.18), 0 4px 10px -6px rgb(16 16 24 / 0.10)",
        brand: "0 10px 30px -10px rgb(59 23 255 / 0.40)",
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
        // NOTE: fill-mode is intentionally "forwards" (not "both"). With "both"
        // the element sits at the keyframe's starting opacity:0 before the
        // animation runs, which can leave content invisible if the first frame
        // is never painted. "forwards" keeps the resting state fully visible.
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
