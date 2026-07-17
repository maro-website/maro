"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { BuyCreditsModal } from "@/components/app/BuyCreditsModal";
import { useMaro } from "@/context/store";
import { useSettings } from "@/lib/hooks/useSettings";
import { createProjectFromComposer } from "@/lib/services/projectService";
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
  LayoutTemplate,
  Sparkles,
  Check,
  ChevronDown,
} from "lucide-react";

const EXAMPLES = [
  "Një landing page për një aplikacion fitnesi me çmime dhe dëshmi klientësh",
  "Website për një restorant mesdhetar me menu, galeri dhe rezervime",
  "Faqe biznesi për një studio arkitekture me portfolio projektesh",
  "Platformë SaaS për menaxhim faturash me features dhe pricing",
];

export function Composer() {
  const router = useRouter();
  const { user, credits, addProject } = useMaro();
  const { pricing } = useSettings(Boolean(user));

  const [prompt, setPrompt] = React.useState("");
  const [websiteType, setWebsiteType] = React.useState<WebsiteKind>("business");
  const [speed, setSpeed] = React.useState<SpeedKey>("fast");
  const [showAuth, setShowAuth] = React.useState(false);
  const [showBuy, setShowBuy] = React.useState(false);
  const pendingRef = React.useRef(false);

  const cost = creditCost(pricing, websiteType, speed);

  // Keep the freshest credits value for use inside deferred callbacks.
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

  // After a successful login/signup from the gate, continue automatically.
  const onAuthDone = () => {
    setShowAuth(false);
    if (pendingRef.current) {
      pendingRef.current = false;
      // Give the profile a tick to load before checking credits.
      setTimeout(() => {
        if (creditsRef.current < cost) setShowBuy(true);
        else doGenerate();
      }, 500);
    }
  };

  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        <div className="group relative rounded-[26px] border border-line-strong bg-surface p-2 shadow-pop transition-shadow focus-within:shadow-brand/20">
          <div className="pointer-events-none absolute -inset-px rounded-[26px] bg-gradient-to-b from-brand/10 to-transparent opacity-0 transition-opacity group-focus-within:opacity-100" />
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onGenerate();
            }}
            rows={3}
            placeholder="Përshkruaj website-in që do të ndërtosh…"
            className="relative block max-h-64 min-h-[92px] w-full resize-none rounded-2xl bg-transparent px-4 pt-3 text-[16px] leading-relaxed text-ink outline-none placeholder:text-ink-3"
          />

          <div className="relative flex flex-wrap items-center gap-2 px-2 pb-1 pt-1">
            <ModelSelect />
            <TypeSelect value={websiteType} onChange={setWebsiteType} />
            <SpeedSelect value={speed} onChange={setSpeed} />

            <div className="ml-auto flex items-center gap-2.5">
              <span className="hidden items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-[12.5px] font-semibold text-brand sm:inline-flex">
                <Coins className="h-3.5 w-3.5" /> {cost} kredite
              </span>
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={onGenerate}
                disabled={!prompt.trim()}
                className={cn(
                  "grid h-11 w-11 place-items-center rounded-xl text-brand-fg transition-all",
                  prompt.trim()
                    ? "bg-brand hover:bg-brand-hover shadow-brand/40"
                    : "cursor-not-allowed bg-line-strong text-ink-3"
                )}
                aria-label="Gjenero"
              >
                <ArrowUp className="h-5 w-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Example chips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="mt-5 flex flex-wrap justify-center gap-2"
      >
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => setPrompt(ex)}
            className="rounded-full border border-line bg-surface/70 px-3.5 py-1.5 text-[12.5px] text-ink-2 transition-all hover:border-line-strong hover:text-ink"
          >
            {ex.length > 46 ? ex.slice(0, 46) + "…" : ex}
          </button>
        ))}
      </motion.div>

      <Modal open={showAuth} onClose={() => setShowAuth(false)} size="sm">
        <ModalHeader
          icon={<Sparkles className="h-5 w-5" />}
          title="Hyr për të gjeneruar"
          description="Krijo llogari ose hyr — pastaj vazhdon menjëherë me gjenerimin."
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
    <div className="flex items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-2.5 py-1.5">
      <span className="text-ink-3">{icon}</span>
      <span className="hidden text-[12px] font-medium text-ink-3 md:inline">{label}</span>
      {children}
    </div>
  );
}

function ModelSelect() {
  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-2.5 py-1.5">
      <Cpu className="h-3.5 w-3.5 text-brand" />
      <span className="text-[12.5px] font-semibold text-ink">{MODEL_OPTIONS[0].label}</span>
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
          <span className="text-[12.5px] font-semibold text-ink">{current.label}</span>
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
          <span className="text-[12.5px] font-semibold text-ink">{current.label}</span>
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
