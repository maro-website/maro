"use client";

import { ToolComposer } from "@/components/app/ToolComposer";
import { ModuleHero } from "@/components/modules/ModuleHero";
import { InspirationCarousel } from "@/components/modules/InspirationCarousel";
import { FILMA_INSPIRATION } from "@/lib/modules/filma/inspiration";

export function FilmaWorkspace({ toolId }: { toolId: string }) {
  const headerSlot = (
    <>
      <ModuleHero
        toolId="filma"
        title="Prej ideje, direkt në film."
        subtitle="Përshkruaj skenën, shto referenca dhe lëre maron të prodhojë video të gatshme për social dhe reklama."
      />
      <InspirationCarousel items={FILMA_INSPIRATION} />
    </>
  );

  return <ToolComposer toolId={toolId} layout="gallery" headerSlot={headerSlot} />;
}
