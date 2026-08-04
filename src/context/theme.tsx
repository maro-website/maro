"use client";

import * as React from "react";

export type Theme = "qelt" | "mshelt";

const STORAGE_KEY = "maro.theme";
const DEFAULT_THEME: Theme = "qelt";

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const Ctx = React.createContext<ThemeCtx | null>(null);

const THEME_COLORS: Record<Theme, string> = {
  qelt: "#d0e6fd",
  mshelt: "#191919",
};

/** Map legacy 3-mode values saved in localStorage. */
export function normalizeTheme(raw: string | null): Theme {
  if (raw === "mshelt" || raw === "qelt") return raw;
  if (raw === "mono") return "mshelt";
  if (raw === "light" || raw === "dark") return "qelt";
  return DEFAULT_THEME;
}

function setThemeColor(theme: Theme) {
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", THEME_COLORS[theme]);
}

function apply(theme: Theme, animate: boolean) {
  const el = document.documentElement;
  if (animate) {
    el.classList.add("theme-anim");
    window.setTimeout(() => el.classList.remove("theme-anim"), 400);
  }
  el.setAttribute("data-theme", theme);
  setThemeColor(theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(DEFAULT_THEME);

  React.useEffect(() => {
    const stored = normalizeTheme(localStorage.getItem(STORAGE_KEY));
    setThemeState(stored);
    apply(stored, false);
  }, []);

  const setTheme = React.useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
    apply(t, true);
  }, []);

  const value = React.useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
