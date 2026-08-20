"use client";

import { ToolIcon } from "@/components/app/OptionIcon";
import { Megaphone } from "lucide-react";

export function ModuleHero({
  toolId,
  title,
  subtitle,
}: {
  toolId: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="maro-editorial-hero pb-10 pt-12 sm:pb-14 sm:pt-16 lg:pb-16 lg:pt-24">
      <ToolIcon toolId={toolId} fallback={Megaphone} className="h-14 w-14 text-brand opacity-50 sm:h-16 sm:w-16" />
      <h1 className="mt-8 max-w-2xl text-[clamp(34px,5vw,52px)] font-bold leading-[1.04] tracking-brand text-ink sm:mt-10">
        {title}
      </h1>
      <p className="mt-4 max-w-[var(--layout-hero-subtitle-max)] text-[15px] leading-relaxed text-ink-2 sm:text-[16px]">{subtitle}</p>
    </div>
  );
}
