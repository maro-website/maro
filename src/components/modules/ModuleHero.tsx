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
    <div className="flex flex-col items-center px-4 pb-8 pt-6 text-center sm:pt-10">
      <ToolIcon toolId={toolId} fallback={Megaphone} className="h-14 w-14 text-brand" />
      <h1 className="mt-8 max-w-xl text-[clamp(28px,4vw,40px)] font-bold leading-[1.12] tracking-brand text-ink">
        {title}
      </h1>
      <p className="mt-4 max-w-[var(--layout-hero-subtitle-max)] text-[16px] leading-relaxed text-ink-2">{subtitle}</p>
    </div>
  );
}
