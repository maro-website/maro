"use client";

import { ToolComposer } from "@/components/app/ToolComposer";
import { ModuleHero } from "@/components/modules/ModuleHero";
import { InspirationCarousel } from "@/components/modules/InspirationCarousel";
import { AUDIO_INSPIRATION } from "@/lib/modules/audio/inspiration";

export function AudioWorkspace({ toolId }: { toolId: string }) {
  const headerSlot = (
    <>
      <ModuleHero
        toolId="zo"
        title="Kthe tekstin në zë."
        subtitle="Zë natyral, transkriptim, përkthim dhe efekte — studio audio e plotë për përmbajtje dhe reklama."
      />
      <InspirationCarousel items={AUDIO_INSPIRATION} />
    </>
  );

  return <ToolComposer toolId={toolId} layout="gallery" headerSlot={headerSlot} />;
}
