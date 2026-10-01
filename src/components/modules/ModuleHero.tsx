"use client";

import { ToolIcon } from "@/components/app/OptionIcon";
import { ProductLogo } from "@/components/ui/ProductLogo";
import { getProductBrand } from "@/lib/design/maro-system";
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
    <div className="maro-editorial-hero pb-8 pt-8 sm:pb-10 sm:pt-12">
      {getProductBrand(toolId) && getProductBrand(toolId)?.id !== "maroFort" ? <ProductLogo product={toolId} className="h-12 w-[184px]" /> : <ToolIcon toolId={toolId} fallback={Megaphone} className="h-12 w-12 text-brand" />}
      <h1 className="maro-text-h1 mt-6 max-w-2xl text-ink">
        {title}
      </h1>
      <p className="maro-text-body-lg mt-3 max-w-[var(--layout-hero-subtitle-max)] text-ink-2">{subtitle}</p>
    </div>
  );
}
