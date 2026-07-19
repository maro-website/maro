"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PromptExpand } from "@/components/app/PromptExpand";
import { cn } from "@/lib/utils/cn";
import {
  Clapperboard,
  Cpu,
  Clock,
  Ratio,
  MonitorPlay,
  Gauge,
  Check,
  ChevronDown,
  Maximize2,
  Lock,
  Sparkles,
} from "lucide-react";

const MODELS = ["Seedance 2.0", "Google Omni Flash", "Kling 3.0"];
const DURATIONS = ["5s", "8s", "10s"];
const FORMATS = ["Reel 9:16", "Youtube 16:9"];
const RESOLUTIONS = ["720p", "1080p", "4k"];
const SPEEDS = ["Slow", "Fast", "2x Faster"];

const EASE = [0.22, 1, 0.36, 1] as const;

// Maro Filma is a "coming soon" teaser: the whole UI is live and interactive,
// but generation is intentionally disabled (pure FOMO, no backend).
export function VideoComposer() {
  const [prompt, setPrompt] = React.useState("");
  const [model, setModel] = React.useState(MODELS[0]);
  const [duration, setDuration] = React.useState(DURATIONS[0]);
  const [format, setFormat] = React.useState(FORMATS[0]);
  const [resolution, setResolution] = React.useState(RESOLUTIONS[1]);
  const [speed, setSpeed] = React.useState(SPEEDS[1]);
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="flex h-full flex-col">
      {/* Scroll area: coming-soon hero */}
      <div className="min-h-0 flex-1 overflow-y-auto scroll-thin">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[360px] bg-aurora" />
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-5 py-16 text-center sm:py-24">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="relative"
          >
            {[0, 1, 2].map((n) => (
              <motion.span
                key={n}
                className="absolute inset-0 rounded-3xl border border-brand"
                animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, delay: n * 0.6, ease: "easeOut" }}
              />
            ))}
            <span className="grid h-20 w-20 place-items-center rounded-3xl bg-brand text-brand-fg">
              <Clapperboard className="h-9 w-9" />
            </span>
          </motion.div>

          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
            className="mt-7 inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3.5 py-1.5 text-[12.5px] font-bold uppercase tracking-wide text-ink-2"
          >
            <Sparkles className="h-3.5 w-3.5 text-brand" /> Së shpejti
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE, delay: 0.15 }}
            className="mt-5 text-balance text-[clamp(30px,6vw,50px)] font-extrabold leading-[1.03] tracking-[-0.04em] text-ink"
          >
            Maro Filma
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE, delay: 0.22 }}
            className="mt-3 max-w-md text-[16px] leading-relaxed text-ink-2"
          >
            Gjeneratori i parë shqiptar i videove me AI. Reels, reklama dhe klipe nga një
            fjali. Përgatit promptin tënd, gjenerimi hapet së shpejti.
          </motion.p>
        </div>
      </div>

      {/* Docked prompt box (fully interactive, generate disabled) */}
      <div className="shrink-0 border-t border-line bg-canvas/90 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-4 py-3 sm:px-5 sm:py-4">
          <div className="group relative rounded-[24px] border border-line-strong bg-surface p-2 shadow-pop">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
              placeholder="Përshkruaj videon: skena, lëvizja, atmosfera, muzika…"
              className="relative block max-h-52 min-h-[64px] w-full resize-none rounded-2xl bg-transparent px-3 pt-2.5 text-[16px] leading-relaxed text-ink outline-none placeholder:text-ink-3"
            />

            <div className="relative flex flex-wrap items-center gap-2 px-1.5 pb-0.5 pt-1">
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface-2 text-ink-2 transition-colors hover:text-ink"
                title="Zgjero"
                aria-label="Zgjero promptin"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <Select icon={<Cpu className="h-3.5 w-3.5 text-brand" />} label="Modeli" value={model} options={MODELS} onChange={setModel} />
              <Select icon={<Clock className="h-3.5 w-3.5" />} label="Kohë" value={duration} options={DURATIONS} onChange={setDuration} />
              <Select icon={<Ratio className="h-3.5 w-3.5" />} label="Format" value={format} options={FORMATS} onChange={setFormat} />
              <Select icon={<MonitorPlay className="h-3.5 w-3.5" />} label="Rez." value={resolution} options={RESOLUTIONS} onChange={setResolution} />
              <Select icon={<Gauge className="h-3.5 w-3.5" />} label="Shpejtësi" value={speed} options={SPEEDS} onChange={setSpeed} />

              <div className="ml-auto">
                <button
                  disabled
                  className="flex cursor-not-allowed items-center gap-1.5 rounded-xl bg-surface-2 px-4 py-2.5 text-[14px] font-semibold text-ink-3"
                  title="Së shpejti"
                >
                  <Lock className="h-4 w-4" /> Së shpejti
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PromptExpand
        open={expanded}
        value={prompt}
        onChange={setPrompt}
        onClose={() => setExpanded(false)}
        placeholder="Përshkruaj videon: skena, lëvizja, atmosfera, muzika…"
      />
    </div>
  );
}

function Select({
  icon,
  label,
  value,
  options,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-2.5 py-2 text-ink"
      >
        <span className="text-ink-3">{icon}</span>
        <span className="hidden text-[12.5px] font-medium text-ink-3 md:inline">{label}</span>
        <span className="text-[13px] font-semibold text-ink">{value}</span>
        <ChevronDown className="h-3.5 w-3.5 text-ink-3" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute bottom-full left-0 z-30 mb-2 w-48 rounded-xl border border-line bg-surface p-1 shadow-pop"
          >
            {options.map((o) => (
              <button
                key={o}
                onClick={() => {
                  onChange(o);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13.5px] transition-colors hover:bg-surface-2",
                  o === value ? "font-semibold text-ink" : "text-ink-2"
                )}
              >
                {o}
                {o === value && <Check className="h-4 w-4 text-brand" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
