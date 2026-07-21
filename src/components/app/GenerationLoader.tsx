"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { WaitingSnake } from "@/components/app/WaitingSnake";

// A big, varied pool of messages so waiting never feels like a fake 3-step
// loop. We shuffle and walk the queue, reshuffling only when exhausted.
const IMAGE_MSGS = [
  "Po e mendoj konceptin…",
  "Po skicoj format bazë…",
  "Po zgjedh paletën e ngjyrave…",
  "Po balancoj hapësirën negative…",
  "Po rregulloj kompozimin…",
  "Po shtoj detajet e imëta…",
  "Po ndriçoj skenën…",
  "Po pastroj skajet…",
  "Po kontrolloj kontrastin…",
  "Po e bëj pixel-perfect…",
  "Po i jap dorën e fundit…",
  "Po eksportoj rezultatin…",
];

const WEB_MSGS = [
  "Po e kuptoj biznesin tënd…",
  "Po ndërtoj strukturën e faqeve…",
  "Po zgjedh drejtimin vizual…",
  "Po shkruaj tekstet…",
  "Po zgjedh fotot e duhura…",
  "Po ndërtoj hero-n…",
  "Po rregulloj tipografinë…",
  "Po aplikoj brandin…",
  "Po e bëj responsive për mobile…",
  "Po optimizoj shpejtësinë…",
  "Po shtoj animacionet…",
  "Po bëj kontrollin final…",
];

const TIPS = [
  "Këshillë: sa më specifik prompti, aq më i mirë rezultati.",
  "E dije? Mund t'i bësh favorite krijimet dhe t'i gjesh te «Të preferuarat».",
  "Provo modele të ndryshme kur të aktivizohen — çdo model ka stilin e vet.",
  "Ndërkohë, luaj pak Snake. Rekordi yt ruhet!",
];

function useRotating(pool: string[], intervalMs: number) {
  const queue = React.useRef<string[]>([]);
  const [msg, setMsg] = React.useState(pool[0]);
  React.useEffect(() => {
    const next = () => {
      if (queue.current.length === 0) {
        queue.current = [...pool].sort(() => Math.random() - 0.5);
      }
      setMsg(queue.current.shift() as string);
    };
    next();
    const t = setInterval(next, intervalMs);
    return () => clearInterval(t);
  }, [pool, intervalMs]);
  return msg;
}

export function GenerationLoader({
  variant = "image",
  title,
  className,
}: {
  variant?: "image" | "website";
  title?: string;
  className?: string;
}) {
  const pool = variant === "website" ? WEB_MSGS : IMAGE_MSGS;
  const msg = useRotating(pool, 2400);
  const tip = useRotating(TIPS, 6000);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={
        "flex flex-col items-center overflow-hidden rounded-3xl border border-line bg-surface px-6 py-10 " +
        (className ?? "")
      }
    >
      <div className="relative h-20 w-20">
        {[0, 1, 2].map((n) => (
          <motion.span
            key={n}
            className="absolute inset-0 rounded-full border border-brand"
            animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, delay: n * 0.5, ease: "easeOut" }}
          />
        ))}
        <motion.span
          className="absolute inset-0 grid place-items-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        >
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand text-brand-fg">
            <Sparkles className="h-6 w-6" />
          </span>
        </motion.span>
      </div>

      {title && <div className="mt-5 text-[15px] font-semibold text-ink">{title}</div>}
      <div className="mt-1 h-5 text-[13.5px] text-ink-2">
        <AnimatePresence mode="wait">
          <motion.span
            key={msg}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
          >
            {msg}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Snake — desktop only, so it never loads/annoys on mobile. */}
      <div className="mt-6 hidden sm:block">
        <WaitingSnake />
      </div>

      <div className="mt-5 max-w-sm text-center text-[12px] text-ink-3">{tip}</div>
    </motion.div>
  );
}
