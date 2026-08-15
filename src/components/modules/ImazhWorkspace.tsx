"use client";

import * as React from "react";
import { ToolComposer } from "@/components/app/ToolComposer";
import { ModuleHero } from "@/components/modules/ModuleHero";
import { InspirationCarousel } from "@/components/modules/InspirationCarousel";
import { IMAZH_INSPIRATION } from "@/lib/modules/imazh/inspiration";

export function ImazhWorkspace({ toolId }: { toolId: string }) {
  const headerSlot = (
    <>
      <ModuleHero
        toolId="reklama"
        title="Ktheje idenë në imazh."
        subtitle="Krijo reklama, postime, produkte, fotografi dhe vizuale nga një ide e thjeshtë."
      />
      <InspirationCarousel items={IMAZH_INSPIRATION} />
    </>
  );

  return <ToolComposer toolId={toolId} layout="gallery" headerSlot={headerSlot} />;
}
