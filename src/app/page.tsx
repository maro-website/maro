"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/Badge";
import { useMaro } from "@/context/store";
import { TOOLS, type ToolDef } from "@/lib/tools/registry";
import { ArrowRight, Coins, Sparkles, Wand2, Rocket } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function HomePage() {
  const { user } = useMaro();
  const firstName = user?.name?.split(" ")[0];

  const heroRef = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const auroraY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const auroraScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const heroFade = useTransform(scrollYProgress, [0, 1], [1, 0]);

  return (
    <AppShell>
      {/* HERO */}
      <section ref={heroRef} className="relative overflow-hidden">
        <motion.div
          style={{ y: auroraY, scale: auroraScale }}
          className="pointer-events-none absolute inset-0 -z-10 bg-aurora opacity-70"
        />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-[0.25] [mask-image:radial-gradient(ellipse_at_top,black_10%,transparent_60%)]" />

        <motion.div
          style={{ opacity: heroFade }}
          className="mx-auto max-w-3xl px-6 pb-10 pt-20 text-center sm:pt-28"
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <Badge tone="brand" className="mb-6 px-3 py-1 text-[12px]">
              <Sparkles className="mr-1 inline h-3.5 w-3.5" /> MARO · AI Hub
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.05 }}
            className="text-balance text-[clamp(34px,6vw,62px)] font-extrabold leading-[1.02] tracking-[-0.045em] text-ink"
          >
            {firstName ? `Mirë se erdhe, ${firstName}.` : "Krijo çdo gjë"}
            <br />
            <span className="text-gradient">me një fjali.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.12 }}
            className="mx-auto mt-5 max-w-xl text-balance text-[16px] leading-relaxed text-ink-2"
          >
            Një vend i vetëm për website, logo dhe reklama — të gjitha me AI, të gjitha me kredite.
            Zgjidh një tool dhe fillo.
          </motion.p>
        </motion.div>
      </section>

      {/* TOOLS GRID */}
      <section className="relative mx-auto w-full max-w-5xl px-6 pb-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool, i) => (
            <ToolCard key={tool.id} tool={tool} index={i} />
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto w-full max-w-5xl px-6 py-14">
        <Reveal>
          <h2 className="text-center text-[clamp(22px,3vw,32px)] font-extrabold tracking-[-0.03em] text-ink">
            Si funksionon
          </h2>
        </Reveal>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.08}>
              <div className="h-full rounded-2xl border border-line bg-surface p-6">
                <div
                  className="grid h-11 w-11 place-items-center rounded-xl"
                  style={{ color: s.color, background: `${s.color}14` }}
                >
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="mt-4 text-[15px] font-bold text-ink">{s.title}</div>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <div className="mt-auto border-t border-line py-6 text-center text-[12px] text-ink-3">
        Maro · maro.al — Website (Claude Opus 4.8) · Imazhe (gpt-image-2)
      </div>
    </AppShell>
  );
}

const STEPS = [
  { icon: Wand2, title: "1. Përshkruaj", body: "Shkruaj çka do me pak fjalë — pa nevojë për detaje teknike.", color: "var(--g-blue)" },
  { icon: Sparkles, title: "2. Maro maron", body: "AI gjeneron rezultatin duke ndjekur stilin e master-promptit tënd.", color: "var(--brand)" },
  { icon: Rocket, title: "3. Përdore", body: "Shkarko ose publiko menjëherë. Çdo gjë ruhet te profili yt.", color: "var(--g-green)" },
];

function ToolCard({ tool, index }: { tool: ToolDef; index: number }) {
  const router = useRouter();
  return (
    <motion.button
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: EASE, delay: index * 0.06 }}
      whileHover={{ y: -6 }}
      onClick={() => router.push(tool.route)}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-surface p-6 text-left shadow-subtle transition-shadow hover:shadow-pop"
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-40 blur-2xl transition-opacity group-hover:opacity-70"
        style={{ background: tool.accentSoft }}
      />
      <div
        className="relative grid h-12 w-12 place-items-center rounded-2xl"
        style={{ color: tool.accent, background: tool.accentSoft }}
      >
        <tool.icon className="h-6 w-6" />
      </div>

      <div className="relative mt-4 text-[17px] font-extrabold tracking-[-0.02em] text-ink">
        {tool.name}
      </div>
      <div className="relative text-[13px] font-medium" style={{ color: tool.accent }}>
        {tool.tagline}
      </div>
      <p className="relative mt-2 flex-1 text-[13.5px] leading-relaxed text-ink-2">
        {tool.description}
      </p>

      <div className="relative mt-5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-[12px] font-semibold text-ink-2">
          <Coins className="h-3.5 w-3.5 text-brand" />
          {tool.kind === "website" ? "nga 5 kredite" : `${tool.defaultCost} kredite`}
        </span>
        <span
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white transition-transform group-hover:translate-x-0.5"
          style={{ background: tool.accent }}
        >
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </motion.button>
  );
}

function Reveal({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}
