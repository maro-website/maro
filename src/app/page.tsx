"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { useMaro } from "@/context/store";
import { TOOLS, type ToolDef } from "@/lib/tools/registry";
import { saveLastTool } from "@/lib/tools/selections";
import { cn } from "@/lib/utils/cn";
import { ArrowUp, Lock, Coins } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function HomePage() {
  const { user, credits } = useMaro();
  const router = useRouter();
  const firstName = user?.name?.split(" ")[0];
  const [prompt, setPrompt] = React.useState("");
  const [picked, setPicked] = React.useState<string>("website");
  // Day (06:00–18:00) => "sot"; night (18:00–06:00) => "sonte".
  const [dayPart, setDayPart] = React.useState<"sot" | "sonte">("sot");
  React.useEffect(() => {
    const h = new Date().getHours();
    setDayPart(h >= 6 && h < 18 ? "sot" : "sonte");
  }, []);
  const isFree = !user?.plan || user.plan === "free";

  const go = (tool: ToolDef) => {
    setPicked(tool.id);
    try {
      if (prompt.trim()) sessionStorage.setItem("maro:hubdraft", prompt.trim());
    } catch {
      /* ignore */
    }
    saveLastTool(tool.id);
    router.push(tool.route);
  };

  const active = TOOLS.find((t) => t.id === picked) ?? TOOLS[0];

  return (
    <AppShell>
      <div className="relative flex h-full flex-col items-center justify-center overflow-y-auto scroll-thin px-5 py-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-aurora" />

        <div className="w-full max-w-2xl">
          {user && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="mb-4 flex items-center justify-center gap-2 text-[13px]"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 font-semibold text-ink-2">
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

          {/* Centered prompt box */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.08 }}
            className="mt-8 rounded-[26px] border border-line-strong bg-surface p-2.5 shadow-pop"
          >
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) go(active);
              }}
              rows={2}
              placeholder="Përshkruaj çka do të marosh…"
              className="block max-h-52 min-h-[68px] w-full resize-none rounded-2xl bg-transparent px-3.5 pt-3 text-[16px] leading-relaxed text-ink outline-none placeholder:text-ink-3"
            />

            <div className="flex items-center justify-between gap-2 px-1.5 pb-0.5 pt-1.5">
              <span className="text-[12.5px] text-ink-3">Zgjidh një tool për të vazhduar</span>
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={() => go(active)}
                className="grid h-11 w-11 place-items-center rounded-xl bg-brand text-brand-fg transition-colors hover:bg-brand-hover"
                aria-label="Vazhdo"
              >
                <ArrowUp className="h-5 w-5" />
              </motion.button>
            </div>
          </motion.div>

          {/* Tool selector */}
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {TOOLS.map((tool, i) => (
              <motion.button
                key={tool.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE, delay: 0.12 + i * 0.05 }}
                onClick={() => go(tool)}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl border bg-surface p-3.5 text-left transition-all hover:shadow-pop",
                  picked === tool.id ? "border-brand" : "border-line"
                )}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink">
                  <tool.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[14.5px] font-bold tracking-[-0.01em] text-ink">
                    {tool.name}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 text-[12px] text-ink-3">
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
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
