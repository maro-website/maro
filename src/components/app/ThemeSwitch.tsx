"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/theme";
import { SwitchTrack } from "@/components/ui/Switch";
import { cn } from "@/lib/utils/cn";

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const dark = theme === "mshelt";
  return <button type="button" role="menuitemcheckbox" aria-checked={dark} aria-label="Mshelt (dark)"
    onClick={() => setTheme(dark ? "qelt" : "mshelt")}
    className="maro-switch flex min-h-11 w-full items-center justify-between gap-2 rounded-maro12 bg-surface-2 px-3 text-[13px] font-semibold">
    <span className={cn("inline-flex items-center gap-1.5", dark ? "text-menu-muted" : "text-menu-fg")}><Sun className="h-4 w-4" aria-hidden />Qelt</span>
    <SwitchTrack checked={dark} />
    <span className={cn("inline-flex items-center gap-1.5", dark ? "text-menu-fg" : "text-menu-muted")}><Moon className="h-4 w-4" aria-hidden />Mshelt</span>
  </button>;
}
