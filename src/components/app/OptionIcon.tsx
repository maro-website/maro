"use client";

import type { LucideIcon } from "lucide-react";
import { useTheme } from "@/context/theme";
import { resolveOptionIconUrl, type ToolOptionIcons } from "@/lib/tools/optionIcons";
import { cn } from "@/lib/utils/cn";

export function OptionIcon({
  toolId,
  settingId,
  optionId,
  icons,
  fallback: Fallback,
  className,
}: {
  toolId: string;
  settingId: string;
  optionId: string;
  icons?: ToolOptionIcons;
  fallback: LucideIcon;
  className?: string;
}) {
  const { theme } = useTheme();
  const url = resolveOptionIconUrl(icons, toolId, settingId, optionId, theme);
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className={cn("h-3.5 w-3.5 shrink-0 object-contain", className)}
      />
    );
  }
  return <Fallback className={cn("h-3.5 w-3.5 shrink-0 text-ink-3", className)} />;
}
