"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

const STORAGE_KEY = "maro.previewDark";
const DARK_THEME_COLOR = "#0c0c0c";
const LIGHT_THEME_COLOR = "#F9F9F9";

const PREVIEW_PATHS = new Set(["/", "/hub-vision", "/imazh", "/marologo"]);

function pathAllowsPreview(pathname: string) {
  return PREVIEW_PATHS.has(pathname);
}

function applyPreviewDark(on: boolean) {
  const root = document.documentElement;
  if (on) {
    root.setAttribute("data-maro-preview-dark", "");
  } else {
    root.removeAttribute("data-maro-preview-dark");
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", on ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
  }
}

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeStored(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
  } catch {
    /* private mode */
  }
}

export function PreviewDarkMode() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [on, setOn] = React.useState(false);
  const showToggle = pathAllowsPreview(pathname);

  React.useEffect(() => {
    const fromUrl = searchParams.get("preview") === "dark";
    const initial = fromUrl || readStored();
    setOn(initial);
    applyPreviewDark(initial);
    if (fromUrl) writeStored(true);
  }, [searchParams]);

  React.useEffect(() => {
    applyPreviewDark(on);
    writeStored(on);
  }, [on]);

  if (process.env.NODE_ENV !== "development") return null;
  if (!showToggle) return null;

  return (
    <button
      type="button"
      onClick={() => setOn((v) => !v)}
      aria-pressed={on}
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 9999,
        minHeight: 44,
        padding: "0 14px",
        borderRadius: 10,
        border: "1px solid var(--maro-color-border-default)",
        background: "var(--maro-color-bg-surface)",
        color: "var(--maro-color-text-primary)",
        fontFamily: "var(--maro-font-family)",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "-0.03em",
        cursor: "pointer",
        boxShadow: "none",
      }}
    >
      {on ? "Light preview" : "Dark preview"}
    </button>
  );
}
