"use client";

import { AppShell } from "@/components/app/AppShell";
import { Lightbulb, Lock } from "lucide-react";

export default function PromptePage() {
  return (
    <AppShell>
      <div className="relative flex h-full flex-col items-center justify-center overflow-y-auto scroll-thin px-5 py-10 text-center">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-aurora" />
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-surface-2 text-brand">
          <Lightbulb className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-[clamp(26px,4vw,38px)] font-light tracking-[-0.03em] text-ink">
          maro Prompts
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-2">
          Çdo ditë prompte profesionale gati për t&apos;u përdorur: 1 falas + 2 premium.
          Ngarko produktin tënd dhe gjenero më lehtë se kurrë.
        </p>
        <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-4 py-2 text-[13.5px] font-semibold text-ink-2">
          <Lock className="h-4 w-4" /> Së shpejti
        </span>
      </div>
    </AppShell>
  );
}
