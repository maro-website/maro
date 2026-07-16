"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MaroSymbol } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Misc";
import { useEditor, type Device } from "@/context/editor";
import { cn } from "@/lib/utils/cn";
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Monitor,
  Tablet,
  Smartphone,
  Eye,
  Rocket,
  Check,
  Loader2,
} from "lucide-react";

const DEVICES: { key: Device; icon: React.ElementType; label: string }[] = [
  { key: "desktop", icon: Monitor, label: "Desktop" },
  { key: "tablet", icon: Tablet, label: "Tablet" },
  { key: "mobile", icon: Smartphone, label: "Mobile" },
];

export function EditorTopBar({ onPublish, onPreview }: { onPublish: () => void; onPreview: () => void }) {
  const router = useRouter();
  const { project, device, setDevice, saveStatus, undo, redo, canUndo, canRedo } = useEditor();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-canvas px-3">
      <div className="flex items-center gap-1">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          <MaroSymbol className="h-6 w-6" />
        </button>
        <div className="mx-2 h-5 w-px bg-line" />
        <div className="flex items-center gap-2">
          <span className="max-w-[200px] truncate text-[14px] font-semibold text-ink">{project.name}</span>
          <span className="flex items-center gap-1 text-[12px] text-ink-3">
            {saveStatus === "saving" ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Duke ruajtur...
              </>
            ) : (
              <>
                <Check className="h-3 w-3 text-success" /> Ruajtur
              </>
            )}
          </span>
        </div>
      </div>

      <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1">
        <div className="flex items-center rounded-lg bg-surface-2 p-0.5">
          <Tooltip content="Zhbëj">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="grid h-8 w-8 place-items-center rounded-md text-ink-2 transition-colors hover:bg-surface hover:text-ink disabled:opacity-40"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip content="Ribëj">
            <button
              onClick={redo}
              disabled={!canRedo}
              className="grid h-8 w-8 place-items-center rounded-md text-ink-2 transition-colors hover:bg-surface hover:text-ink disabled:opacity-40"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>
        <div className="mx-1 h-5 w-px bg-line" />
        <div className="flex items-center rounded-lg bg-surface-2 p-0.5">
          {DEVICES.map((d) => (
            <Tooltip key={d.key} content={d.label}>
              <button
                onClick={() => setDevice(d.key)}
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-md transition-all",
                  device === d.key ? "bg-surface text-brand shadow-subtle" : "text-ink-2 hover:text-ink"
                )}
              >
                <d.icon className="h-4 w-4" />
              </button>
            </Tooltip>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" icon={<Eye className="h-4 w-4" />} onClick={onPreview}>
          Preview
        </Button>
        <Button size="sm" icon={<Rocket className="h-4 w-4" />} onClick={onPublish}>
          Publiko
        </Button>
      </div>
    </header>
  );
}
