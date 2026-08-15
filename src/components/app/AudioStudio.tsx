"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getTool } from "@/lib/tools/registry";
import { MaroBuildingLoader } from "@/components/app/MaroBuildingLoader";
import { cn } from "@/lib/utils/cn";
import { AudioLines, Mic, Languages } from "lucide-react";

const TABS = [
  { id: "tts", label: "Text në Zë", icon: Mic },
  { id: "voice", label: "Ndrysho Zërin", icon: AudioLines },
  { id: "translate", label: "Përkthe", icon: Languages },
] as const;

/** Audio workspace shell — TTS tabs + voice picker (generation gated). */
export function AudioStudio({ toolId }: { toolId: string }) {
  const tool = getTool(toolId)!;
  const router = useRouter();
  const [tab, setTab] = React.useState<(typeof TABS)[number]["id"]>("tts");

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <aside className="scroll-thin w-full shrink-0 overflow-y-auto border-b border-line bg-surface lg:w-[360px] lg:border-b-0 lg:border-r">
        <div className="flex gap-1 border-b border-line p-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-[12px] font-semibold sm:text-[13px]",
                  tab === t.id ? "bg-ink text-white" : "text-ink-2 hover:bg-canvas"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-5">
          <h1 className="text-[18px] font-bold tracking-brand text-ink">{tool.name}</h1>
          <p className="mt-1 text-[14px] text-ink-2">{tool.description}</p>

          <div className="mt-5">
            <label className="mb-2 block text-[13px] font-semibold text-ink-2">
              Zgjidh zërin <span className="text-danger">*</span>
            </label>
            <button
              type="button"
              disabled
              className="flex h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-canvas text-[13px] text-ink-3"
            >
              <Mic className="h-8 w-8" />
              Zgjidh preset ose ngarko zë
            </button>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-[13px] font-semibold text-ink-2">Skripti</label>
            <textarea
              disabled
              rows={5}
              placeholder="Shkruaj saktësisht çka do lexojë zëri…"
              className="w-full resize-none rounded-xl border border-line bg-canvas px-3 py-2.5 text-[14px] text-ink-3"
            />
          </div>

          <div className="mt-4 rounded-xl border border-line bg-canvas px-3 py-2.5 text-[14px] text-ink-3">
            ElevenLabs v3 · së shpejti
          </div>

          <button
            type="button"
            disabled
            className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-generate-idle text-[15px] font-bold text-generate-fg-idle"
          >
            Gjenero · së shpejti
          </button>
        </div>
      </aside>

      <section className="scroll-thin flex min-h-0 flex-1 flex-col items-center justify-center bg-canvas p-6">
        <div className="max-w-md rounded-maro16 border border-line bg-surface px-8 py-16 text-center">
          <MaroBuildingLoader size={44} />
          <p className="mt-4 text-[16px] font-bold text-ink">Kthe tekstin në zë</p>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
            Zë natyral, muzikë, efekte dhe transkriptim — studio audio vjen së shpejti.
          </p>
          <button
            type="button"
            onClick={() => router.push("/imazh")}
            className="mt-6 rounded-xl bg-ink px-5 py-2.5 text-[14px] font-bold text-white hover:opacity-90"
          >
            Provo maro Imazh
          </button>
        </div>
      </section>
    </div>
  );
}
