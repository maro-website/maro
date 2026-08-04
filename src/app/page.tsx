"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { useMaro } from "@/context/store";
import {
  ACTIVE_MAIN_TOOLS,
  COMING_SOON_MAIN_TOOLS,
  type ToolDef,
} from "@/lib/tools/registry";
import { saveLastTool } from "@/lib/tools/selections";
import { cn } from "@/lib/utils/cn";
import { ArrowUp, Lock, Coins } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

const EASE = [0.22, 1, 0.36, 1] as const;

function ToolCard({
  tool,
  picked,
  onPick,
  index,
}: {
  tool: ToolDef;
  picked: string | null;
  onPick: (tool: ToolDef) => void;
  index: number;
}) {
  const selected = picked === tool.id;
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay: 0.12 + index * 0.05 }}
      onClick={() => onPick(tool)}
      className={cn(
        "group flex items-center gap-3 rounded-2xl p-3.5 text-left transition-all",
        selected ? "bg-brand text-brand-fg shadow-sm" : "bg-surface hover:bg-surface-2",
        !tool.functional && "opacity-90"
      )}
    >
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
          selected ? "bg-brand-fg/15 text-brand-fg" : "bg-surface-2 text-ink"
        )}
      >
        <tool.icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "block truncate text-[14.5px] font-bold tracking-[-0.01em]",
            selected ? "text-brand-fg" : "text-ink"
          )}
        >
          {tool.name}
        </span>
        <span
          className={cn(
            "mt-0.5 flex items-center gap-1 text-[12px]",
            selected ? "text-brand-fg/70" : "text-ink-3"
          )}
        >
          {tool.functional ? (
            tool.tagline
          ) : (
            <>
              <Lock className="h-3 w-3" /> Së shpejti
            </>
          )}
        </span>
      </span>
    </motion.button>
  );
}

export default function HomePage() {
  const { user, credits } = useMaro();
  const router = useRouter();
  const { toast } = useToast();
  const firstName = user?.name?.split(" ")[0];
  const [prompt, setPrompt] = React.useState("");
  const [picked, setPicked] = React.useState<string | null>(null);
  const [dayPart, setDayPart] = React.useState<"sot" | "sonte">("sot");

  React.useEffect(() => {
    const h = new Date().getHours();
    setDayPart(h >= 6 && h < 18 ? "sot" : "sonte");
  }, []);

  const isFree = !user?.plan || user.plan === "free";

  const pick = (tool: ToolDef) => {
    setPicked(tool.id);
  };

  const go = (tool: ToolDef) => {
    try {
      if (prompt.trim()) sessionStorage.setItem("maro:hubdraft", prompt.trim());
    } catch {
      /* ignore */
    }
    saveLastTool(tool.id);
    router.push(tool.route);
  };

  const handleToolClick = (tool: ToolDef) => {
    if (tool.functional) {
      pick(tool);
      return;
    }
    go(tool);
  };

  const submit = () => {
    if (!picked) {
      toast("Zgjidh një tool për të vazhduar.");
      return;
    }
    const tool =
      ACTIVE_MAIN_TOOLS.find((t) => t.id === picked) ??
      COMING_SOON_MAIN_TOOLS.find((t) => t.id === picked);
    if (tool) go(tool);
  };

  return (
    <AppShell>
      <div className="relative flex h-full min-w-0 flex-col items-center justify-center overflow-x-clip overflow-y-auto scroll-thin px-4 py-10 max-lg:h-auto max-lg:overflow-y-visible sm:px-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-aurora" />

        <div className="w-full max-w-2xl sm:max-w-[702px]">
          {user && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="mb-4 flex items-center justify-center gap-2 text-[13px]"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 font-semibold text-ink-2">
                <Coins className="h-3.5 w-3.5 text-brand" /> {credits} kredite
              </span>
              <span className="text-ink-3">·</span>
              <span className="capitalize text-ink-3">Plani {user.plan || "free"}</span>
              {isFree && (
                <button
                  onClick={() => router.push("/credits")}
                  className="font-semibold text-brand underline-offset-2 hover:underline"
                >
                  Abonohu?
                </button>
              )}
            </motion.div>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="text-balance text-center text-[clamp(28px,5vw,46px)] font-light leading-[1.08] tracking-[-0.03em] text-ink"
          >
            {firstName
              ? `Çka po marojmë ${dayPart}, ${firstName}?`
              : `Çka po marojmë ${dayPart}?`}
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.08 }}
            className="mt-8 rounded-[26px] bg-surface p-2.5"
          >
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              }}
              rows={2}
              placeholder="Përshkruaj çka do të marosh…"
              className="block max-h-52 min-h-[68px] w-full resize-none rounded-2xl bg-transparent px-3.5 pt-3 text-[16px] leading-relaxed text-ink outline-none placeholder:text-ink-3"
            />

            <div className="flex items-center justify-between gap-2 px-1.5 pb-0.5 pt-1.5">
              <span className="text-[12.5px] text-ink-3">
                {picked ? "Gati për të vazhduar" : "Zgjidh një tool për të vazhduar"}
              </span>
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={submit}
                disabled={!picked}
                className={cn(
                  "grid h-11 w-11 place-items-center rounded-xl transition-colors",
                  picked
                    ? "bg-brand text-brand-fg hover:bg-brand-hover"
                    : "cursor-not-allowed bg-surface-2 text-ink-3"
                )}
                aria-label="Vazhdu"
              >
                <ArrowUp className="h-5 w-5" />
              </motion.button>
            </div>
          </motion.div>

          <div className="mt-6">
            <p className="mb-2.5 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-3">
              Aktiv
            </p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {ACTIVE_MAIN_TOOLS.map((tool, i) => (
                <ToolCard key={tool.id} tool={tool} picked={picked} onPick={handleToolClick} index={i} />
              ))}
            </div>
          </div>

          {COMING_SOON_MAIN_TOOLS.length > 0 && (
            <div className="mt-5">
              <p className="mb-2.5 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-3">
                Së shpejti
              </p>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {COMING_SOON_MAIN_TOOLS.map((tool, i) => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    picked={picked}
                    onPick={handleToolClick}
                    index={ACTIVE_MAIN_TOOLS.length + i}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
