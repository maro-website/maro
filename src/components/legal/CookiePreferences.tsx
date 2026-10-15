"use client";

import { openCookieSettings } from "@/lib/analytics/consent";
import { cn } from "@/lib/utils/cn";

export function CookiePreferences({ className }: { className?: string }) {
  return <button type="button" onClick={openCookieSettings} className={cn("min-h-11 rounded-maro12 text-[12px] font-medium text-ink-2 transition-colors hover:text-ink", className)}>Cilësimet e cookies</button>;
}
