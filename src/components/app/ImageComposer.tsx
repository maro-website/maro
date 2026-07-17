"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { BuyCreditsModal } from "@/components/app/BuyCreditsModal";
import { useToast } from "@/components/ui/Toast";
import { useMaro } from "@/context/store";
import { useSettings } from "@/lib/hooks/useSettings";
import {
  generateImages,
  InsufficientCreditsError,
  ImageGenerationError,
} from "@/lib/services/imageService";
import { imageToolCost } from "@/lib/supabase/types";
import {
  IMAGE_QUALITIES,
  IMAGE_SIZES,
  getTool,
  type ImageQuality,
  type ImageSize,
  type ToolId,
} from "@/lib/tools/registry";
import { uid } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import {
  ArrowUp,
  Coins,
  Ratio,
  Gauge,
  Sparkles,
  Check,
  ChevronDown,
  Download,
  Trash2,
  ImageOff,
} from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  "no-key": "Çelësi i OpenAI nuk është konfiguruar në server ende.",
  unauthorized: "Sesioni skadoi. Hyr përsëri dhe provo sërish.",
  "ai-failed": "Modeli nuk u përgjigj. Provo përsëri ose ndrysho përshkrimin.",
  empty: "Nuk u kthye asnjë imazh. Provo përsëri.",
  "bad-tool": "Tool i pavlefshëm.",
};

export function ImageComposer({ toolId, examples = [] }: { toolId: ToolId; examples?: string[] }) {
  const tool = getTool(toolId)!;
  const { toast } = useToast();
  const { user, credits, creations, addCreation, deleteCreation, spendCredits } = useMaro();
  const { pricing } = useSettings(Boolean(user));

  const [prompt, setPrompt] = React.useState("");
  const [size, setSize] = React.useState<ImageSize>("1024x1024");
  const [quality, setQuality] = React.useState<ImageQuality>("high");
  const [loading, setLoading] = React.useState(false);
  const [showAuth, setShowAuth] = React.useState(false);
  const [showBuy, setShowBuy] = React.useState(false);
  const pendingRef = React.useRef(false);

  const cost = imageToolCost(pricing, tool.id, tool.defaultCost);
  const creditsRef = React.useRef(credits);
  creditsRef.current = credits;

  const toolCreations = creations.filter((c) => c.toolId === tool.id);

  const doGenerate = React.useCallback(async () => {
    const text = prompt.trim();
    if (!text) return;
    setLoading(true);
    try {
      const res = await generateImages({ toolId: tool.id, prompt: text, size, quality });
      spendCredits(res.creditsSpent || cost);
      addCreation({
        id: uid("img"),
        toolId: tool.id,
        prompt: text,
        urls: res.images,
        size,
        quality,
        createdAt: new Date().toISOString(),
      });
      setPrompt("");
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        setShowBuy(true);
      } else if (err instanceof ImageGenerationError) {
        toast(ERROR_MESSAGES[err.code] || `Gabim gjenerimi (${err.code}).`);
      } else {
        toast("Gabim i papritur. Provo përsëri.");
      }
    } finally {
      setLoading(false);
    }
  }, [prompt, size, quality, tool.id, cost, spendCredits, addCreation, toast]);

  const onGenerate = () => {
    if (!prompt.trim() || loading) return;
    if (!user) {
      pendingRef.current = true;
      setShowAuth(true);
      return;
    }
    if (credits < cost) {
      setShowBuy(true);
      return;
    }
    void doGenerate();
  };

  const onAuthDone = () => {
    setShowAuth(false);
    if (pendingRef.current) {
      pendingRef.current = false;
      setTimeout(() => {
        if (creditsRef.current < cost) setShowBuy(true);
        else void doGenerate();
      }, 500);
    }
  };

  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="group relative rounded-[26px] border border-line-strong bg-surface p-2 shadow-pop">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onGenerate();
            }}
            rows={3}
            placeholder={
              tool.id === "logo"
                ? "P.sh. Logo minimaliste për një brand kafeje, simbol filxhani, ngjyra tokësore…"
                : "P.sh. Banner reklame për ofertë vere, ngjyra të ngrohta, hapësirë për tekst…"
            }
            className="relative block max-h-64 min-h-[92px] w-full resize-none rounded-2xl bg-transparent px-4 pt-3 text-[16px] leading-relaxed text-ink outline-none placeholder:text-ink-3"
          />

          <div className="relative flex flex-wrap items-center gap-2 px-2 pb-1 pt-1">
            <SizeSelect value={size} onChange={setSize} />
            <QualitySelect value={quality} onChange={setQuality} />

            <div className="ml-auto flex items-center gap-2.5">
              <span className="hidden items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-[12.5px] font-semibold text-brand sm:inline-flex">
                <Coins className="h-3.5 w-3.5" /> {cost} kredite
              </span>
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={onGenerate}
                disabled={!prompt.trim() || loading}
                className={cn(
                  "grid h-11 w-11 place-items-center rounded-xl text-white transition-all",
                  prompt.trim() && !loading ? "shadow-brand/40" : "cursor-not-allowed bg-line-strong text-ink-3"
                )}
                style={prompt.trim() && !loading ? { background: tool.accent } : undefined}
                aria-label="Gjenero"
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <ArrowUp className="h-5 w-5" />
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Example chips */}
      {examples.length > 0 && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {examples.map((ex) => (
            <button
              key={ex}
              onClick={() => setPrompt(ex)}
              className="rounded-full border border-line bg-surface/70 px-3.5 py-1.5 text-[12.5px] text-ink-2 transition-all hover:border-line-strong hover:text-ink"
            >
              {ex.length > 46 ? ex.slice(0, 46) + "…" : ex}
            </button>
          ))}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton aspect-square rounded-2xl" />
          ))}
        </div>
      )}

      {/* Results gallery */}
      <ImageResultGallery
        creations={toolCreations}
        accent={tool.accent}
        onDelete={deleteCreation}
      />

      <Modal open={showAuth} onClose={() => setShowAuth(false)} size="sm">
        <ModalHeader
          icon={<Sparkles className="h-5 w-5" />}
          title="Hyr për të gjeneruar"
          description="Krijo llogari ose hyr — pastaj vazhdon menjëherë."
        />
        <div className="px-6 pb-6">
          <AuthPanel onDone={onAuthDone} />
        </div>
      </Modal>

      <BuyCreditsModal open={showBuy} onClose={() => setShowBuy(false)} needed={cost} />
    </div>
  );
}

// ---- Results ----

function ImageResultGallery({
  creations,
  accent,
  onDelete,
}: {
  creations: { id: string; prompt: string; urls: string[]; createdAt: string }[];
  accent: string;
  onDelete: (id: string) => void;
}) {
  if (creations.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-surface-2/50 px-6 py-12 text-center">
        <ImageOff className="h-7 w-7 text-ink-3" />
        <p className="mt-3 text-[13.5px] text-ink-3">
          Këtu shfaqen imazhet e gjeneruara. Shkruaj një përshkrim lart për të filluar.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-8">
      {creations.map((c) => (
        <div key={c.id}>
          <div className="mb-2.5 flex items-start justify-between gap-3">
            <p className="line-clamp-2 text-[13.5px] text-ink-2">{c.prompt}</p>
            <button
              onClick={() => onDelete(c.id)}
              className="shrink-0 rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-surface-2 hover:text-danger"
              title="Fshi"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {c.urls.map((url, i) => (
              <ImageTile key={i} url={url} accent={accent} name={`maro-${c.id}-${i + 1}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ImageTile({ url, accent, name }: { url: string; accent: string; name: string }) {
  const [busy, setBusy] = React.useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `${name}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch {
      window.open(url, "_blank");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-line bg-surface-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="aspect-square w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 flex items-end justify-end bg-gradient-to-t from-ink/50 to-transparent p-2.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={download}
          disabled={busy}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 text-[12px] font-semibold text-ink shadow-sm transition-transform hover:scale-[1.03]"
          style={{ color: accent }}
        >
          <Download className="h-3.5 w-3.5" /> {busy ? "…" : "Shkarko"}
        </button>
      </div>
    </div>
  );
}

// ---- Selectors ----

function Popover({
  trigger,
  children,
}: {
  trigger: (open: boolean) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center">
        {trigger(open)}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-60 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-pop"
          >
            {children(() => setOpen(false))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Segmented({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-2.5 py-1.5">
      <span className="text-ink-3">{icon}</span>
      <span className="hidden text-[12px] font-medium text-ink-3 md:inline">{label}</span>
      <span className="text-[12.5px] font-semibold text-ink">{value}</span>
      <ChevronDown className="h-3.5 w-3.5 text-ink-3" />
    </div>
  );
}

function OptionRow({
  active,
  title,
  hint,
  onClick,
}: {
  active: boolean;
  title: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors",
        active ? "bg-brand-soft" : "hover:bg-surface-2"
      )}
    >
      <span>
        <span className={cn("block text-[13.5px] font-semibold", active ? "text-brand" : "text-ink")}>
          {title}
        </span>
        {hint && <span className="block text-[12px] text-ink-3">{hint}</span>}
      </span>
      {active && <Check className="h-4 w-4 text-brand" />}
    </button>
  );
}

function SizeSelect({ value, onChange }: { value: ImageSize; onChange: (v: ImageSize) => void }) {
  const current = IMAGE_SIZES.find((s) => s.value === value)!;
  return (
    <Popover trigger={() => <Segmented icon={<Ratio className="h-3.5 w-3.5" />} label="Format" value={current.label} />}>
      {(close) => (
        <>
          {IMAGE_SIZES.map((s) => (
            <OptionRow
              key={s.key}
              active={s.value === value}
              title={s.label}
              onClick={() => {
                onChange(s.value);
                close();
              }}
            />
          ))}
        </>
      )}
    </Popover>
  );
}

function QualitySelect({ value, onChange }: { value: ImageQuality; onChange: (v: ImageQuality) => void }) {
  const current = IMAGE_QUALITIES.find((q) => q.key === value)!;
  return (
    <Popover trigger={() => <Segmented icon={<Gauge className="h-3.5 w-3.5" />} label="Cilësia" value={current.label} />}>
      {(close) => (
        <>
          {IMAGE_QUALITIES.map((q) => (
            <OptionRow
              key={q.key}
              active={q.key === value}
              title={q.label}
              hint={q.hint}
              onClick={() => {
                onChange(q.key);
                close();
              }}
            />
          ))}
        </>
      )}
    </Popover>
  );
}
