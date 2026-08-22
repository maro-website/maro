"use client";

import * as React from "react";
import type { InspirationItem } from "@/lib/modules/imazh/inspiration";
import {
  IMAZH_INSPIRATION_FALLBACK,
  IMAZH_INSPIRATION_FALLBACK_IMAGE,
  MARO_IMAGE_URL_MIME,
  MARO_PRESET_MIME,
  presetAttachFromItem,
} from "@/lib/modules/imazh/inspiration";
import { fetchPromptDetail, fetchPrompts } from "@/lib/services/promptsService";
import type { PromptAttach } from "@/lib/prompts/types";
import type { PromptItem } from "@/lib/prompts/types";
import { ToolComposer } from "@/components/app/ToolComposer";
import { ModuleHero } from "@/components/modules/ModuleHero";
import { InspirationCarousel } from "@/components/modules/InspirationCarousel";

const IMAZH_TARGET_TOOL = "reklama";

function promptToCarouselItem(p: PromptItem): InspirationItem {
  return {
    id: p.id,
    imageUrl: p.featured_url || IMAZH_INSPIRATION_FALLBACK_IMAGE,
    category: p.category,
    label: p.code,
    preset: {
      id: p.id,
      code: p.code,
      tool: "imazh",
      targetTool: p.target_tool,
    },
  };
}

export function ImazhWorkspace({ toolId }: { toolId: string }) {
  const [promptAttach, setPromptAttach] = React.useState<PromptAttach | null>(null);
  const [carouselItems, setCarouselItems] = React.useState<InspirationItem[]>(IMAZH_INSPIRATION_FALLBACK);

  React.useEffect(() => {
    let alive = true;
    void fetchPrompts().then((r) => {
      if (!alive) return;
      const imazhPresets = r.items.filter((p) => p.target_tool === IMAZH_TARGET_TOOL);
      if (imazhPresets.length > 0) {
        setCarouselItems(imazhPresets.map(promptToCarouselItem));
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const onPresetSelect = React.useCallback((attach: PromptAttach) => {
    setPromptAttach(attach);
    void fetchPromptDetail(attach.id).then((detail) => {
      if (detail.tool !== "imazh" || detail.target_tool !== IMAZH_TARGET_TOOL) return;
      setPromptAttach({ ...attach, title: detail.title, tool: "imazh", config: detail.config });
    }).catch(() => undefined);
  }, []);

  const headerSlot = (
    <>
      <ModuleHero
        toolId="reklama"
        title="Ktheje idenë në imazh."
        subtitle="Krijo reklama, postime, produkte, fotografi dhe vizuale nga një ide e thjeshtë."
      />
      <InspirationCarousel
        items={carouselItems}
        activePresetId={promptAttach?.id ?? null}
        onPresetSelect={onPresetSelect}
      />
    </>
  );

  return (
    <ToolComposer
      toolId={toolId}
      layout="gallery"
      headerSlot={headerSlot}
      promptAttach={promptAttach}
      onPromptAttachChange={setPromptAttach}
    />
  );
}
