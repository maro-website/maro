"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getTool } from "@/lib/tools/registry";
import { MaroBuildingLoader } from "@/components/app/MaroBuildingLoader";
import { cn } from "@/lib/utils/cn";
import { Clock, Clapperboard, History, Ratio } from "lucide-react";

/** Video workspace shell — left config + right history (generation gated). */
export function VideoStudio({ toolId }: { toolId: string }) {
  const tool = getTool(toolId)!;
  const router = useRouter();
  const [tab, setTab] = React.useState<"create" | "history">("create");

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <aside className="scroll-thin w-full shrink-0 overflow-y-auto border-b border-line bg-surface lg:w-[340px] lg:border-b-0 lg:border-r">
        <div className="flex border-b border-line lg:hidden">
          {(["create", "history"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-3 text-[14px] font-semibold",
                tab === t ? "border-b-2 border-brand text-ink" : "text-ink-3"
              )}
            >
              {t === "create" ? "Krijo" : "Historiku"}
            </button>
          ))}
        </div>

        <div className={cn("p-5", tab === "history" && "hidden lg:block")}>
          <div className="mb-4 flex items-center gap-2">
            <Clapperboard className="h-5 w-5 text-ink" />
            <h1 className="text-[18px] font-bold tracking-brand text-ink">{tool.name}</h1>
          </div>
          <p className="text-[14px] leading-relaxed text-ink-2">{tool.description}</p>

          <div className="mt-5 space-y-3">
            <label className="block text-[13px] font-semibold text-ink-2">Modeli</label>
            <div className="rounded-xl border border-line bg-canvas px-3 py-2.5 text-[14px] text-ink-3">
              Seedance 2.0 · së shpejti
            </div>
            <label className="block text-[13px] font-semibold text-ink-2">Referenca</label>
            <button
              type="button"
              disabled
              className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line bg-canvas text-[13px] text-ink-3"
            >
              Shto imazh / video
            </button>
            <label className="block text-[13px] font-semibold text-ink-2">Prompt</label>
            <textarea
              disabled
              rows={4}
              placeholder="Përshkruaj skenën…"
              className="w-full resize-none rounded-xl border border-line bg-canvas px-3 py-2.5 text-[14px] text-ink-3"
            />
            <div className="flex flex-wrap gap-2">
              <span className="maro-pill bg-surface text-ink-2">
                <Ratio className="h-4 w-4" /> 9:16
              </span>
              <span className="maro-pill bg-surface text-ink-2">
                <Clock className="h-4 w-4" /> 5s
              </span>
            </div>
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

      <section
        className={cn(
          "scroll-thin min-h-0 flex-1 overflow-y-auto bg-canvas p-5",
          tab === "create" && "hidden lg:block"
        )}
      >
        <div className="mb-4 flex items-center gap-2 text-ink-2">
          <History className="h-5 w-5" />
          <h2 className="text-[16px] font-bold tracking-brand text-ink">Historiku</h2>
        </div>
        <div className="flex flex-col items-center justify-center rounded-maro16 border border-line bg-surface px-6 py-20 text-center">
          <MaroBuildingLoader size={40} />
          <p className="mt-4 text-[15px] font-semibold text-ink">{tool.name} vjen së shpejti</p>
          <p className="mt-2 max-w-sm text-[14px] text-ink-2">
            Po ndërtojmë studio video me historik, referenca dhe modele të avancuara.
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
