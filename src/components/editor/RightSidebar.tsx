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
import { SourcePanel } from "./panels/SourcePanel";
import { VisualEditPanel } from "./panels/VisualEditPanel";
import { Code2, MousePointer2, Palette, Type, ImageIcon, Files, History, Search } from "lucide-react";

const SECTION_TABS: { key: RightTab; icon: React.ElementType; label: string }[] = [
  { key: "design", icon: Palette, label: "Design" },
  { key: "content", icon: Type, label: "Content" },
  { key: "assets", icon: ImageIcon, label: "Assets" },
  { key: "pages", icon: Files, label: "Pages" },
  { key: "versions", icon: History, label: "Versions" },
  { key: "seo", icon: Search, label: "SEO" },
];

const HTML_TABS: { key: RightTab; icon: React.ElementType; label: string }[] = [
  { key: "edit", icon: MousePointer2, label: "Edito" },
  { key: "code", icon: Code2, label: "Kodi" },
  { key: "pages", icon: Files, label: "Faqet" },
  { key: "versions", icon: History, label: "Versionet" },
];

export function RightSidebar() {
  const { project, rightTab, setRightTab } = useEditor();
  const tabs = project.renderMode === "html" ? HTML_TABS : SECTION_TABS;
  const activeTab = tabs.some((tab) => tab.key === rightTab) ? rightTab : tabs[0].key;

  React.useEffect(() => {
    if (activeTab !== rightTab) setRightTab(activeTab);
  }, [activeTab, rightTab, setRightTab]);

  return (
    <div className="flex h-full">
      <div className="scroll-thin flex-1 overflow-y-auto bg-canvas">
        <div className="flex h-11 items-center px-4 text-[13px] font-bold capitalize text-ink">
          {tabs.find((t) => t.key === activeTab)?.label}
        </div>
        {activeTab === "edit" && <VisualEditPanel />}
        {activeTab === "code" && <SourcePanel />}
        {activeTab === "design" && <DesignPanel />}
        {activeTab === "content" && <ContentPanel />}
        {activeTab === "assets" && <AssetsPanel />}
        {activeTab === "pages" && <PagesPanel />}
        {activeTab === "versions" && <VersionsPanel />}
        {activeTab === "seo" && <SeoPanel />}
      </div>

      {/* Icon rail */}
      <div className="flex w-14 shrink-0 flex-col items-center gap-1 bg-surface py-3">
        {tabs.map((t) => (
          <Tooltip key={t.key} content={t.label} side="bottom">
            <button
              onClick={() => setRightTab(t.key)}
              className={cn(
                "grid h-10 w-10 place-items-center rounded-xl transition-all",
                activeTab === t.key ? "bg-surface-2 text-ink" : "text-ink-3 hover:bg-surface-2 hover:text-ink"
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
