"use client";

import * as React from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { ArrowLeft, Wrench } from "lucide-react";

const LEGAL_PAGES = [
  { href: "/legal/terms", label: "Kushtet e Përdorimit" },
  { href: "/legal/privacy", label: "Politika e Privatësisë" },
  { href: "/legal/cookies", label: "Politika e Cookies" },
];

export function LegalPlaceholder({
  title,
  current,
}: {
  title: string;
  current: string;
}) {
  return (
    <div className="relative min-h-screen bg-canvas text-ink">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[280px] bg-aurora" />

      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 py-8 sm:px-8 sm:py-12">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="maro">
            <Logo showWord />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-line-strong bg-surface px-3 py-2 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-surface-2"
          >
            <ArrowLeft className="h-4 w-4" /> Kthehu
          </Link>
        </div>

        {/* Hero */}
        <div className="mt-14 flex flex-col items-center text-center sm:mt-20">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-warning/10 text-warning">
            <Wrench className="h-8 w-8" />
          </span>
          <h1 className="mt-6 text-[clamp(28px,5vw,44px)] font-light tracking-[-0.03em] text-ink">
            {title}
          </h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-2">
            Po punojmë për këtë faqe. Së shpejti do të gjesh këtu të gjitha detajet ligjore. Faleminderit
            për mirëkuptimin.
          </p>
          <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3.5 py-1.5 text-[12.5px] font-semibold text-ink-2">
            <Wrench className="h-3.5 w-3.5" /> Në punë e sipër
          </span>
        </div>

        {/* Other legal pages */}
        <div className="mt-14 border-t border-line pt-6">
          <div className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            Faqet ligjore
          </div>
          <div className="flex flex-col gap-2">
            {LEGAL_PAGES.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className={
                  "flex items-center justify-between rounded-xl border px-4 py-3 text-[14px] font-semibold transition-colors " +
                  (p.label === current
                    ? "border-brand bg-brand-soft text-ink"
                    : "border-line-strong bg-surface text-ink-2 hover:bg-surface-2")
                }
              >
                {p.label}
                {p.label === current && (
                  <span className="text-[11.5px] font-bold uppercase tracking-wide text-brand">
                    Këtu
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-10 text-center text-[12px] text-ink-3">
          &copy; {new Date().getFullYear()} maro
        </div>
      </div>
    </div>
  );
}
