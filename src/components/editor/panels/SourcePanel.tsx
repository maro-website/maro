"use client";

import * as React from "react";
import { useEditor } from "@/context/editor";
import { PanelSection } from "./PanelKit";
import { Check, Code2 } from "lucide-react";

export function SourcePanel() {
  const { project, updateHtmlPage } = useEditor();
  const pages = project.htmlPages ?? [];
  const activePage =
    pages.find((page) => page.id === project.activeHtmlPageId) ?? pages[0];

  if (!activePage) {
    return (
      <PanelSection>
        <div className="flex flex-col items-center py-10 text-center">
          <Code2 className="mb-2 h-6 w-6 text-ink-3" />
          <p className="text-[13px] text-ink-3">Ky projekt nuk ka faqe HTML për editim.</p>
        </div>
      </PanelSection>
    );
  }

  return (
    <div className="flex min-h-0 flex-col">
      <PanelSection>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-ink">{activePage.name}</div>
            <div className="mt-0.5 truncate text-[11px] text-ink-3">/{activePage.slug}</div>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-[10.5px] font-medium text-success">
            <Check className="h-3 w-3" /> Auto-ruhet
          </span>
        </div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">
          Ndryshimet shfaqen menjëherë në preview. Undo i grupon shkrimet e njëpasnjëshme.
        </p>
      </PanelSection>

      <div className="min-h-0 flex-1 p-3 pt-0">
        <textarea
          key={activePage.id}
          aria-label={`Kodi HTML për ${activePage.name}`}
          value={activePage.html}
          onChange={(event) => updateHtmlPage(activePage.id, event.target.value)}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className="scroll-thin h-[calc(100dvh-215px)] min-h-[360px] w-full resize-none rounded-xl bg-surface p-3 font-mono text-[11.5px] leading-[1.65] text-ink outline-none ring-1 ring-line transition focus:ring-2 focus:ring-brand/30"
        />
      </div>
    </div>
  );
}
