"use client";

import { ToolComposer } from "@/components/app/ToolComposer";
import { ModuleHero } from "@/components/modules/ModuleHero";
import { InspirationCarousel } from "@/components/modules/InspirationCarousel";
import { WEB_INSPIRATION } from "@/lib/modules/web/inspiration";

export function WebWorkspace({ toolId }: { toolId: string }) {
  const headerSlot = (
    <>
      <ModuleHero
        toolId="website"
        title="Prej idesë, direkt në website."
        subtitle="Përshkruaje çka të duhet. Maro e ndërton strukturën, dizajnin dhe kodin për ty."
      />
      <InspirationCarousel items={WEB_INSPIRATION} />
    </>
  );

  return <ToolComposer toolId={toolId} layout="conversation" headerSlot={headerSlot} />;
}
