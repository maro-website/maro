"use client";

import * as React from "react";

export type Theme = "light" | "dark" | "mono";

const STORAGE_KEY = "maro.theme";

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const Ctx = React.createContext<ThemeCtx | null>(null);

function apply(theme: Theme, animate: boolean) {
  const el = document.documentElement;
  if (animate) {
    el.classList.add("theme-anim");
    window.setTimeout(() => el.classList.remove("theme-anim"), 400);
  }
  if (theme === "light") el.removeAttribute("data-theme");
  else el.setAttribute("data-theme", theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>("light");

  React.useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "light";
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
