"use client";

import * as React from "react";

/** App UI is light-only; kept for icon resolution hooks that read theme. */
export type Theme = "mshelt";

const THEME_COLOR = "#F5F5F5";

interface ThemeCtx {
  theme: Theme;
}

const Ctx = React.createContext<ThemeCtx | null>(null);

function applyLightTheme() {
  document.documentElement.removeAttribute("data-theme");
  try {
    localStorage.setItem("maro.theme", "mshelt");
  } catch {
    /* private mode */
  }
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", THEME_COLOR);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    applyLightTheme();
  }, []);

  return <Ctx.Provider value={{ theme: "mshelt" }}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
