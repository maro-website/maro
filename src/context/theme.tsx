"use client";

import * as React from "react";
import { useMaro } from "@/context/store";
import { DEFAULT_THEME, resolveTheme, THEME_OWNER_KEY, themePreferenceKey } from "../../theme-preferences.mjs";

export type Theme = "qelt" | "mshelt";

interface ThemeCtx {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const Ctx = React.createContext<ThemeCtx | null>(null);

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "mshelt" ? "#111315" : "#F9F9F9");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { ready, user } = useMaro();
  const owner = ready ? user?.id ?? "guest" : null;
  const [theme, updateTheme] = React.useState<Theme>(DEFAULT_THEME);

  React.useLayoutEffect(() => {
    if (!owner) {
      updateTheme(resolveTheme(document.documentElement.getAttribute("data-theme")));
      return;
    }
    const restore = () => {
      let next: Theme = DEFAULT_THEME;
      try { next = resolveTheme(localStorage.getItem(themePreferenceKey(owner))); } catch { /* Optional browser storage. */ }
      applyTheme(next);
      updateTheme(next);
    };
    try { localStorage.setItem(THEME_OWNER_KEY, owner); } catch { /* Optional browser storage. */ }
    restore();
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === themePreferenceKey(owner)) restore();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [owner]);

  const setTheme = React.useCallback((next: Theme) => {
    applyTheme(next);
    updateTheme(next);
    try { localStorage.setItem(themePreferenceKey(owner ?? "guest"), next); } catch { /* The current tab can still switch. */ }
  }, [owner]);

  const value = React.useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
