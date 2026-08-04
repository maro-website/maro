"use client";

import type { LucideIcon } from "lucide-react";
import { useTheme } from "@/context/theme";
import { resolveOptionIconUrl, type ToolOptionIcons } from "@/lib/tools/optionIcons";
import { staticOptionIconSrc, toolIconSrc, type UiIconKey, uiIconSrc } from "@/lib/tools/iconMap";
import { cn } from "@/lib/utils/cn";

type ImgProps = {
  src: string;
  className?: string;
};

function IconImg({ src, className }: ImgProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={cn("shrink-0 object-contain", className)} />
  );
}

/** Static SVG from public/icons with optional Lucide fallback. */
export function MaroIcon({
  name,
  src,
  fallback: Fallback,
  className,
}: {
  name?: UiIconKey;
  src?: string;
  fallback?: LucideIcon;
  className?: string;
}) {
  const url = src ?? (name ? uiIconSrc(name) : undefined);
  if (url) return <IconImg src={url} className={className} />;
  if (Fallback) return <Fallback className={cn("shrink-0 text-ink-3", className)} />;
  return null;
}

/** Tool / option icon: admin override → public/icons → Lucide. */
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
  const adminUrl = resolveOptionIconUrl(icons, toolId, settingId, optionId, theme);
  const staticUrl = staticOptionIconSrc(toolId, settingId, optionId);
  const url = adminUrl ?? staticUrl;
  if (url) return <IconImg src={url} className={cn("h-3.5 w-3.5", className)} />;
  return <Fallback className={cn("h-3.5 w-3.5 shrink-0 text-ink-3", className)} />;
}

/** Sidebar / tool pill — static tool icon from public/icons. */
export function ToolIcon({
  toolId,
  fallback: Fallback,
  className,
}: {
  toolId: string;
  fallback: LucideIcon;
  className?: string;
}) {
  const url = toolIconSrc(toolId);
  if (url) return <IconImg src={url} className={className} />;
  return <Fallback className={cn("shrink-0 text-ink-3", className)} />;
}
