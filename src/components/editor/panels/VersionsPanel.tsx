"use client";

import * as React from "react";
import { useEditor } from "@/context/editor";
import { PanelSection } from "./PanelKit";
import { useToast } from "@/components/ui/Toast";
import { timeAgo } from "@/lib/utils/format";
import { History, RotateCcw } from "lucide-react";

export function VersionsPanel() {
  const { project, restoreVersion } = useEditor();
  const { toast } = useToast();
  const versions = [...project.versions].reverse();

  return (
    <PanelSection title="Historiku i versioneve">
      <div className="relative space-y-0.5 pl-1">
        {versions.map((v, i) => (
          <div key={v.id} className="group relative flex gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-2">
            <div className="flex flex-col items-center pt-0.5">
              <span className={`h-2.5 w-2.5 rounded-full ${i === 0 ? "bg-brand ring-4 ring-brand-soft" : "bg-line-strong"}`} />
              {i < versions.length - 1 && <span className="mt-1 w-px flex-1 bg-line" />}
            </div>
            <div className="min-w-0 flex-1 pb-2">
              <div className="flex items-center gap-2">
                <span className="truncate text-[13px] font-semibold text-ink">{v.label}</span>
                {i === 0 && <span className="rounded-full bg-brand-soft px-1.5 py-0.5 text-[9.5px] font-bold uppercase text-brand">Aktual</span>}
              </div>
              <div className="text-[11.5px] text-ink-3">{timeAgo(v.createdAt)}</div>
              {i !== 0 && (
                <button
                  onClick={() => { restoreVersion(v.id); toast("Versioni u rikthye"); }}
                  className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-[11.5px] font-semibold text-ink-2 opacity-0 transition-all hover:border-brand/40 hover:text-brand group-hover:opacity-100"
                >
                  <RotateCcw className="h-3 w-3" /> Rikthe
                </button>
              )}
            </div>
          </div>
        ))}
        {versions.length === 0 && (
          <div className="flex flex-col items-center py-8 text-center">
            <History className="mb-2 h-6 w-6 text-ink-3" />
            <div className="text-[13px] text-ink-3">Ende s'ka versione.</div>
          </div>
        )}
      </div>
    </PanelSection>
  );
}
