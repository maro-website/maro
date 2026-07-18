"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { BuyCreditsModal } from "@/components/app/BuyCreditsModal";
import { AdBanner } from "@/components/app/AdBanner";
import { CreationLightbox } from "@/components/app/cards";
import { useToast } from "@/components/ui/Toast";
import { useMaro } from "@/context/store";
import { useSettings } from "@/lib/hooks/useSettings";
import type { ImageCreation } from "@/lib/types";
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
  Trash2,
  ImageOff,
  Paperclip,
  X,
} from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  "no-key": "Çelësi i OpenAI nuk është konfiguruar në server ende.",
  unauthorized: "Sesioni skadoi. Hyr përsëri dhe provo sërish.",
  "ai-failed": "Modeli nuk u përgjigj. Provo përsëri ose ndrysho përshkrimin.",
  empty: "Nuk u kthye asnjë imazh. Provo përsëri.",
  "bad-tool": "Tool i pavlefshëm.",
};

const MAX_ATTACHMENTS = 4;

export function ImageComposer({ toolId }: { toolId: ToolId }) {
  const tool = getTool(toolId)!;
  const { toast } = useToast();
  const { user, credits, creations, addCreation, deleteCreation, spendCredits } = useMaro();
  const { pricing } = useSettings(Boolean(user));

  const [prompt, setPrompt] = React.useState("");
  const [size, setSize] = React.useState<ImageSize>(tool.defaultSize ?? "1024x1024");
  const [quality, setQuality] = React.useState<ImageQuality>(tool.defaultQuality ?? "high");
  const [attachments, setAttachments] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showAuth, setShowAuth] = React.useState(false);
  const [showBuy, setShowBuy] = React.useState(false);
  const pendingRef = React.useRef(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const cost = imageToolCost(pricing, tool.id, tool.defaultCost);
  const creditsRef = React.useRef(credits);
  creditsRef.current = credits;

  const toolCreations = creations.filter((c) => c.toolId === tool.id);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const room = MAX_ATTACHMENTS - attachments.length;
    Array.from(files)
      .slice(0, room)
      .forEach((f) => {
        if (!f.type.startsWith("image/")) return;
        if (f.size > 8 * 1024 * 1024) {
          toast("Imazhi është shumë i madh (max 8MB).");
          return;
        }
        const reader = new FileReader();
        reader.onload = () => setAttachments((a) => [...a, reader.result as string]);
        reader.readAsDataURL(f);
      });
  };

  const doGenerate = React.useCallback(async () => {
    const text = prompt.trim();
    if (!text) return;
    setLoading(true);
    try {
      const res = await generateImages({
        toolId: tool.id,
        prompt: text,
        size,
        quality,
        attachments: attachments.length ? attachments : undefined,
      });
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
      setAttachments([]);
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
  }, [prompt, size, quality, attachments, tool.id, cost, spendCredits, addCreation, toast]);

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
    <div className="flex h-full flex-col">
      {/* Scroll area: header + gallery */}
      <div className="min-h-0 flex-1 overflow-y-auto scroll-thin">
        <div className="mx-auto w-full max-w-3xl px-5 pb-6 pt-8 sm:pt-12">
          <ToolHeader tool={tool} />

          {loading && (
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton aspect-square rounded-2xl" />
              ))}
            </div>
          )}

          <ImageResultGallery creations={toolCreations} onDelete={deleteCreation} />
        </div>
      </div>

      {/* Docked prompt box (bottom, ChatGPT-style) */}
      <div className="shrink-0 border-t border-line bg-canvas/90 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-4 py-3 sm:px-5 sm:py-4">
          <AdBanner toolId={tool.id} />

          {attachments.length > 0 && (
            <div className="mb-2.5 flex flex-wrap gap-2">
              {attachments.map((src, i) => (
                <div key={i} className="relative h-16 w-16 overflow-hidden rounded-xl border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => setAttachments((a) => a.filter((_, j) => j !== i))}
                    className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-ink/70 text-white"
                    aria-label="Hiq"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="group relative rounded-[24px] border border-line-strong bg-surface p-2 shadow-pop">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onGenerate();
              }}
              rows={2}
              placeholder={
                tool.id === "logo"
                  ? "Përshkruaj logon: brand, stil, simbol, ngjyra…"
                  : "Përshkruaj reklamën: produkt, mesazh, stil, ngjyra…"
              }
              className="relative block max-h-52 min-h-[64px] w-full resize-none rounded-2xl bg-transparent px-3 pt-2.5 text-[16px] leading-relaxed text-ink outline-none placeholder:text-ink-3"
            />

            <div className="relative flex flex-wrap items-center gap-2 px-1.5 pb-0.5 pt-1">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={attachments.length >= MAX_ATTACHMENTS}
                className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface-2 text-ink-2 transition-colors hover:text-ink disabled:opacity-50"
                title="Bashkëngjit imazh"
                aria-label="Bashkëngjit imazh"
              >
                <Paperclip className="h-4 w-4" />
              </button>

              <SizeSelect value={size} onChange={setSize} />
              <QualitySelect value={quality} onChange={setQuality} />

              <div className="ml-auto flex items-center gap-2.5">
                <span className="hidden items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-[13px] font-semibold text-brand sm:inline-flex">
                  <Coins className="h-4 w-4" /> {cost}
                </span>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={onGenerate}
                  disabled={!prompt.trim() || loading}
                  className={cn(
                    "grid h-11 w-11 place-items-center rounded-xl text-white transition-all",
                    prompt.trim() && !loading ? "" : "cursor-not-allowed bg-line-strong text-ink-3"
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
        </div>
      </div>

      <Modal open={showAuth} onClose={() => setShowAuth(false)} size="sm">
        <ModalHeader
          icon={<Sparkles className="h-5 w-5" />}
          title="Hyr për të gjeneruar"
          description="Krijo llogari ose hyr, pastaj vazhdon menjëherë."
        />
        <div className="px-6 pb-6">
          <AuthPanel onDone={onAuthDone} />
        </div>
      </Modal>

      <BuyCreditsModal open={showBuy} onClose={() => setShowBuy(false)} needed={cost} />
    </div>
  );
}

function ToolHeader({ tool }: { tool: ReturnType<typeof getTool> }) {
  if (!tool) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-3.5"
    >
      <span
        className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
        style={{ color: tool.accent, background: tool.accentSoft }}
      >
        <tool.icon className="h-6 w-6" />
      </span>
      <div>
        <h1 className="text-[24px] font-extrabold tracking-[-0.03em] text-ink sm:text-[28px]">
          {tool.name}
        </h1>
        <p className="text-[14.5px] text-ink-2">{tool.tagline}</p>
      </div>
    </motion.div>
  );
}

// ---- Results ----

function ImageResultGallery({
  creations,
  onDelete,
}: {
  creations: ImageCreation[];
  onDelete: (id: string) => void;
}) {
  const [selected, setSelected] = React.useState<ImageCreation | null>(null);

  if (creations.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-center rounded-3xl border border-dashed border-line-strong bg-surface-2/50 px-6 py-14 text-center">
        <ImageOff className="h-8 w-8 text-ink-3" />
        <p className="mt-3 text-[14.5px] text-ink-3">
          Këtu shfaqen imazhet e gjeneruara. Shkruaj një përshkrim poshtë për të filluar.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-8">
      {creations.map((c) => (
        <div key={c.id}>
          <div className="mb-2.5 flex items-start justify-between gap-3">
            <p className="line-clamp-2 text-[14px] text-ink-2">{c.prompt}</p>
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
              <button
                key={i}
                onClick={() => setSelected(c)}
                className="group relative block overflow-hidden rounded-2xl border border-line bg-surface-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="aspect-square w-full object-cover" />
                <span className="pointer-events-none absolute inset-0 bg-ink/0 transition-colors group-hover:bg-ink/10" />
              </button>
            ))}
          </div>
        </div>
      ))}
      {selected && (
        <CreationLightbox
          creation={selected}
          open={Boolean(selected)}
          onClose={() => setSelected(null)}
        />
      )}
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
    <div className="flex items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-2.5 py-2">
      <span className="text-ink-3">{icon}</span>
      <span className="hidden text-[12.5px] font-medium text-ink-3 md:inline">{label}</span>
      <span className="text-[13px] font-semibold text-ink">{value}</span>
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
