"use client";

import * as React from "react";
import { useEditor, type RightTab } from "@/context/editor";
import { cn } from "@/lib/utils/cn";
import { Tooltip } from "@/components/ui/Misc";
import { DesignPanel } from "./panels/DesignPanel";
import { ContentPanel } from "./panels/ContentPanel";
import { AssetsPanel } from "./panels/AssetsPanel";
import { PagesPanel } from "./panels/PagesPanel";
import { VersionsPanel } from "./panels/VersionsPanel";
import { SeoPanel } from "./panels/SeoPanel";
import { Palette, Type, ImageIcon, Files, History, Search } from "lucide-react";

const TABS: { key: RightTab; icon: React.ElementType; label: string }[] = [
  { key: "design", icon: Palette, label: "Design" },
  { key: "content", icon: Type, label: "Content" },
  { key: "assets", icon: ImageIcon, label: "Assets" },
  { key: "pages", icon: Files, label: "Pages" },
  { key: "versions", icon: History, label: "Versions" },
  { key: "seo", icon: Search, label: "SEO" },
];

export function RightSidebar() {
  const { rightTab, setRightTab } = useEditor();

  return (
    <div className="flex h-full">
      <div className="scroll-thin flex-1 overflow-y-auto bg-canvas">
        <div className="flex h-11 items-center border-b border-line px-4 text-[13px] font-bold capitalize text-ink">
          {TABS.find((t) => t.key === rightTab)?.label}
        </div>
        {rightTab === "design" && <DesignPanel />}
        {rightTab === "content" && <ContentPanel />}
        {rightTab === "assets" && <AssetsPanel />}
        {rightTab === "pages" && <PagesPanel />}
        {rightTab === "versions" && <VersionsPanel />}
        {rightTab === "seo" && <SeoPanel />}
      </div>

      {/* Icon rail */}
      <div className="flex w-14 shrink-0 flex-col items-center gap-1 border-l border-line bg-surface py-3">
        {TABS.map((t) => (
          <Tooltip key={t.key} content={t.label} side="bottom">
            <button
              onClick={() => setRightTab(t.key)}
              className={cn(
                "grid h-10 w-10 place-items-center rounded-xl transition-all",
                rightTab === t.key ? "bg-brand-soft text-brand" : "text-ink-3 hover:bg-surface-2 hover:text-ink"
              )}
            >
              <t.icon className="h-[18px] w-[18px]" />
            </button>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
