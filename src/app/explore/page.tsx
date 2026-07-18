"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Misc";
import { useToast } from "@/components/ui/Toast";
import { fetchExplore, type ExploreItem } from "@/lib/services/exploreService";
import { trackEvent } from "@/lib/services/trackService";
import { getTool, TOOLS } from "@/lib/tools/registry";
import { cn } from "@/lib/utils/cn";
import { timeAgo } from "@/lib/utils/format";
import { Compass, Copy, Check, Download } from "lucide-react";

export default function ExplorePage() {
  const [items, setItems] = React.useState<ExploreItem[] | null>(null);
  const [selected, setSelected] = React.useState<ExploreItem | null>(null);
  const [filter, setFilter] = React.useState<string>("all");

  React.useEffect(() => {
    void fetchExplore().then(setItems);
  }, []);

  const filtered =
    items?.filter((it) => filter === "all" || it.tool_id === filter) ?? null;

  return (
    <AppShell>
      <div className="h-full overflow-y-auto scroll-thin">
        <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mb-8"
          >
            <div className="flex items-center gap-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand">
                <Compass className="h-5 w-5" />
              </span>
              <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-ink sm:text-[32px]">
                Explore
              </h1>
            </div>
            <p className="mt-2 text-[15px] text-ink-2">
              Krijime të publikuara nga komuniteti i Maro. Kliko për të parë promptin.
            </p>
          </motion.div>

          <div className="mb-6 flex flex-wrap gap-2">
            {[{ id: "all", label: "Të gjitha" }, ...TOOLS.map((t) => ({ id: t.id, label: t.name }))].map(
              (f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-[13.5px] font-semibold transition-colors",
                    filter === f.id
                      ? "border-ink bg-ink text-white"
                      : "border-line-strong bg-surface text-ink-2 hover:bg-surface-2"
                  )}
                >
                  {f.label}
                </button>
              )
            )}
          </div>

          {filtered === null ? (
            <div className="grid place-items-center py-20">
              <Spinner className="h-6 w-6" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl border border-dashed border-line-strong bg-surface-2/50 px-6 py-16 text-center">
              <Compass className="h-8 w-8 text-ink-3" />
              <p className="mt-3 max-w-sm text-[15px] text-ink-2">
                Ende s&apos;ka krijime publike. Gjenero një imazh dhe publikoje te Explore.
              </p>
            </div>
          ) : (
            <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
              {filtered.map((it) => {
                const tool = getTool(it.tool_id);
                return (
                  <button
                    key={it.id}
                    onClick={() => setSelected(it)}
                    className="group mb-4 block w-full overflow-hidden rounded-2xl border border-line bg-surface-2 text-left"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.url} alt="" className="w-full object-cover" />
                    <div className="flex items-center justify-between gap-2 px-3 py-2">
                      <span className="truncate text-[12.5px] font-medium text-ink-2">
                        {it.author || "Anonim"}
                      </span>
                      <span className="shrink-0 text-[11.5px] text-ink-3">{tool?.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selected && (
        <ExploreLightbox item={selected} onClose={() => setSelected(null)} />
      )}
    </AppShell>
  );
}

function ExploreLightbox({ item, onClose }: { item: ExploreItem; onClose: () => void }) {
  const { toast } = useToast();
  const tool = getTool(item.tool_id);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    void trackEvent({ kind: "view", toolId: item.tool_id, prompt: item.prompt || "", url: item.url });
  }, [item.id]);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(item.prompt || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      void trackEvent({ kind: "copy", toolId: item.tool_id, prompt: item.prompt || "", url: item.url });
    } catch {
      toast("Nuk u kopjua dot.");
    }
  };

  return (
    <Modal open onClose={onClose} size="lg" className="max-w-3xl">
      <div className="grid gap-0 md:grid-cols-[1.2fr_1fr]">
        <div className="grid place-items-center bg-surface-2 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.url} alt="" className="max-h-[70vh] w-full rounded-xl object-contain" />
        </div>
        <div className="flex flex-col p-5">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-brand">
            {tool?.icon && <tool.icon className="h-4 w-4" />}
            {tool?.name ?? "Imazh"}
          </div>
          <div className="mt-1 text-[12.5px] text-ink-3">
            nga {item.author || "Anonim"} · {timeAgo(item.created_at)}
          </div>
          <div className="mt-3 text-[12px] font-bold uppercase tracking-wider text-ink-3">
            Prompt
          </div>
          <div className="scroll-thin mt-1.5 h-28 overflow-y-auto rounded-xl border border-line bg-surface-2 p-3 text-[13.5px] leading-relaxed text-ink-2">
            {item.prompt || "Pa prompt"}
          </div>
          <div className="mt-4 grid gap-2">
            <button
              onClick={copyPrompt}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface px-4 py-2.5 text-[14px] font-semibold text-ink transition-colors hover:bg-surface-2"
            >
              {copied ? <Check className="h-4 w-4 text-brand" /> : <Copy className="h-4 w-4" />}
              {copied ? "U kopjua" : "Kopjo prompt"}
            </button>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface px-4 py-2.5 text-[14px] font-semibold text-ink transition-colors hover:bg-surface-2"
            >
              <Download className="h-4 w-4" /> Hap imazhin
            </a>
          </div>
        </div>
      </div>
    </Modal>
  );
}
