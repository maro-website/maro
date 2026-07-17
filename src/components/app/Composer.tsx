"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { BuyCreditsModal } from "@/components/app/BuyCreditsModal";
import { ProjectCard } from "@/components/app/cards";
import { useMaro } from "@/context/store";
import { useSettings } from "@/lib/hooks/useSettings";
import { createProjectFromComposer } from "@/lib/services/projectService";
import { getTool } from "@/lib/tools/registry";
import {
  creditCost,
  MODEL_OPTIONS,
  SPEED_OPTIONS,
  WEBSITE_KINDS,
  type SpeedKey,
  type WebsiteKind,
} from "@/lib/supabase/types";
import { cn } from "@/lib/utils/cn";
import {
  ArrowUp,
  Coins,
  Cpu,
  Gauge,
  Globe,
  LayoutTemplate,
  Sparkles,
  Check,
  ChevronDown,
} from "lucide-react";

const tool = getTool("website")!;

export function Composer() {
  const router = useRouter();
  const { user, credits, projects, addProject } = useMaro();
  const { pricing } = useSettings(Boolean(user));

  const [prompt, setPrompt] = React.useState("");
  const [websiteType, setWebsiteType] = React.useState<WebsiteKind>(tool.defaultType ?? "landing");
  const [speed, setSpeed] = React.useState<SpeedKey>(tool.defaultSpeed ?? "fast");
  const [showAuth, setShowAuth] = React.useState(false);
  const [showBuy, setShowBuy] = React.useState(false);
  const pendingRef = React.useRef(false);

  const cost = creditCost(pricing, websiteType, speed);

  const creditsRef = React.useRef(credits);
  creditsRef.current = credits;

  const doGenerate = React.useCallback(() => {
    const text = prompt.trim();
    if (!text) return;
    const project = createProjectFromComposer({ prompt: text, websiteType, speed });
    addProject(project);
    router.push(`/projects/${project.id}/generating`);
  }, [prompt, websiteType, speed, addProject, router]);

  const onGenerate = () => {
    if (!prompt.trim()) return;
    if (!user) {
      pendingRef.current = true;
      setShowAuth(true);
      return;
    }
    if (credits < cost) {
      setShowBuy(true);
      return;
    }
    doGenerate();
  };

  const onAuthDone = () => {
    setShowAuth(false);
    if (pendingRef.current) {
      pendingRef.current = false;
      setTimeout(() => {
        if (creditsRef.current < cost) setShowBuy(true);
        else doGenerate();
      }, 500);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Scroll area: header + recent websites */}
      <div className="min-h-0 flex-1 overflow-y-auto scroll-thin">
        <div className="mx-auto w-full max-w-3xl px-5 pb-6 pt-8 sm:pt-12">
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
              <Globe className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-[24px] font-extrabold tracking-[-0.03em] text-ink sm:text-[28px]">
                {tool.name}
              </h1>
              <p className="text-[14.5px] text-ink-2">{tool.tagline}</p>
            </div>
          </motion.div>

          {projects.length > 0 ? (
            <div className="mt-8">
              <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-ink-3">
                Website-t e fundit
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {projects.slice(0, 6).map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    onOpen={(proj) =>
                      router.push(
                        proj.status === "generating"
                          ? `/projects/${proj.id}/generating`
                          : `/projects/${proj.id}/editor`
                      )
                    }
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-10 flex flex-col items-center rounded-3xl border border-dashed border-line-strong bg-surface-2/50 px-6 py-14 text-center">
              <Sparkles className="h-8 w-8 text-ink-3" />
              <p className="mt-3 max-w-sm text-[14.5px] text-ink-3">
                Përshkruaj biznesin poshtë, zgjidh tipin dhe shpejtësinë, dhe Maro e maron
                me Claude Opus 4.8.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Docked prompt box */}
      <div className="shrink-0 border-t border-line bg-canvas/90 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-4 py-3 sm:px-5 sm:py-4">
          <div className="group relative rounded-[24px] border border-line-strong bg-surface p-2 shadow-pop">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onGenerate();
              }}
              rows={2}
              placeholder="Përshkruaj website-in që do të ndërtosh…"
              className="relative block max-h-52 min-h-[64px] w-full resize-none rounded-2xl bg-transparent px-3 pt-2.5 text-[16px] leading-relaxed text-ink outline-none placeholder:text-ink-3"
            />

            <div className="relative flex flex-wrap items-center gap-2 px-1.5 pb-0.5 pt-1">
              <ModelSelect />
              <TypeSelect value={websiteType} onChange={setWebsiteType} />
              <SpeedSelect value={speed} onChange={setSpeed} />

              <div className="ml-auto flex items-center gap-2.5">
                <span className="hidden items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-[13px] font-semibold text-brand sm:inline-flex">
                  <Coins className="h-4 w-4" /> {cost}
                </span>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={onGenerate}
                  disabled={!prompt.trim()}
                  className={cn(
                    "grid h-11 w-11 place-items-center rounded-xl text-brand-fg transition-all",
                    prompt.trim()
                      ? "bg-brand hover:bg-brand-hover"
                      : "cursor-not-allowed bg-line-strong text-ink-3"
                  )}
                  aria-label="Gjenero"
                >
                  <ArrowUp className="h-5 w-5" />
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
          description="Krijo llogari ose hyr, pastaj vazhdon menjëherë me gjenerimin."
        />
        <div className="px-6 pb-6">
          <AuthPanel onDone={onAuthDone} />
        </div>
      </Modal>

      <BuyCreditsModal open={showBuy} onClose={() => setShowBuy(false)} needed={cost} />
    </div>
  );
}

// ---- Selectors ----

function Segmented({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-2.5 py-2">
      <span className="text-ink-3">{icon}</span>
      <span className="hidden text-[12.5px] font-medium text-ink-3 md:inline">{label}</span>
      {children}
    </div>
  );
}

function ModelSelect() {
  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-2.5 py-2">
      <Cpu className="h-3.5 w-3.5 text-brand" />
      <span className="text-[13px] font-semibold text-ink">{MODEL_OPTIONS[0].label}</span>
    </div>
  );
}

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
            className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-64 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-pop"
          >
            {children(() => setOpen(false))}
          </motion.div>
        )}
      </AnimatePresence>
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
  hint: string;
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
        <span className="block text-[12px] text-ink-3">{hint}</span>
      </span>
      {active && <Check className="h-4 w-4 text-brand" />}
    </button>
  );
}

function TypeSelect({
  value,
  onChange,
}: {
  value: WebsiteKind;
  onChange: (v: WebsiteKind) => void;
}) {
  const current = WEBSITE_KINDS.find((k) => k.key === value)!;
  return (
    <Popover
      trigger={() => (
        <Segmented icon={<LayoutTemplate className="h-3.5 w-3.5" />} label="Tipi">
          <span className="text-[13px] font-semibold text-ink">{current.label}</span>
          <ChevronDown className="h-3.5 w-3.5 text-ink-3" />
        </Segmented>
      )}
    >
      {(close) => (
        <>
          {WEBSITE_KINDS.map((k) => (
            <OptionRow
              key={k.key}
              active={k.key === value}
              title={k.label}
              hint={k.hint}
              onClick={() => {
                onChange(k.key);
                close();
              }}
            />
          ))}
        </>
      )}
    </Popover>
  );
}

function SpeedSelect({ value, onChange }: { value: SpeedKey; onChange: (v: SpeedKey) => void }) {
  const current = SPEED_OPTIONS.find((s) => s.key === value)!;
  return (
    <Popover
      trigger={() => (
        <Segmented icon={<Gauge className="h-3.5 w-3.5" />} label="Shpejtësia">
          <span className="text-[13px] font-semibold text-ink">{current.label}</span>
          <ChevronDown className="h-3.5 w-3.5 text-ink-3" />
        </Segmented>
      )}
    >
      {(close) => (
        <>
          {SPEED_OPTIONS.map((s) => (
            <OptionRow
              key={s.key}
              active={s.key === value}
              title={s.label}
              hint={s.hint}
              onClick={() => {
                onChange(s.key);
                close();
              }}
            />
          ))}
        </>
      )}
    </Popover>
  );
}
