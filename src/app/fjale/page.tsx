"use client";

import * as React from "react";
import { AppShell } from "@/components/app/AppShell";
import { AssistantPanel } from "@/components/app/AssistantPanel";
import { TOOLS } from "@/lib/tools/registry";

const CONTEXT_TOOLS = TOOLS.filter((t) => t.functional && t.kind !== "prompts");

export default function FjalePage() {
  const [toolId, setToolId] = React.useState<string>("");

  return (
    <AppShell>
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-2.5">
          <span className="text-[13px] font-semibold text-ink-3">Konteksti:</span>
          <select
            value={toolId}
            onChange={(e) => setToolId(e.target.value)}
            className="rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-[13.5px] font-semibold text-ink outline-none"
          >
            <option value="">E përgjithshme</option>
            {CONTEXT_TOOLS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-h-0 flex-1">
          <AssistantPanel variant="page" toolId={toolId || undefined} />
        </div>
      </div>
    </AppShell>
  );
}
