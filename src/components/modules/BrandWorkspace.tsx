"use client";

import * as React from "react";
import { ToolComposer } from "@/components/app/ToolComposer";
import { ModuleHero } from "@/components/modules/ModuleHero";
import { InspirationCarousel } from "@/components/modules/InspirationCarousel";
import { BRAND_INSPIRATION } from "@/lib/modules/brand/inspiration";

export function BrandWorkspace({ toolId }: { toolId: string }) {
  const headerSlot = (
    <>
      <ModuleHero
        toolId="logo"
        title="Logo dhe identitet visual."
        subtitle="Gjenero logo, simbole dhe variante brandi që reflektojnë identitetin e workspace-it tënd."
      />
      <InspirationCarousel items={BRAND_INSPIRATION} />
    </>
  );

  return <ToolComposer toolId={toolId} layout="gallery" headerSlot={headerSlot} />;
}
