"use client";

import * as React from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { X, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function WizardTopBar({ onExit }: { onExit: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
        <Link href="/dashboard" className="flex items-center">
          <Logo />
        </Link>
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <X className="h-4 w-4" /> Mbyll
        </button>
      </div>
    </header>
  );
}

export function WizardProgress({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-all duration-300",
            i < step ? "bg-brand" : i === step ? "bg-brand/40" : "bg-line-strong"
          )}
        />
      ))}
    </div>
  );
}

export function StepFrame({
  step,
  total,
  title,
  subtitle,
  children,
  onBack,
  onNext,
  nextLabel = "Vazhdo",
  nextDisabled,
  nextIcon,
}: {
  step: number;
  total: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextIcon?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <div className="mb-8">
        <WizardProgress step={step} total={total} />
        <div className="mt-3 text-[12.5px] font-medium text-ink-3">
          Hapi {step + 1} nga {total}
        </div>
      </div>

      <div key={step} className="animate-fade-up">
        <h1 className="text-[28px] font-extrabold tracking-[-0.03em] text-ink">{title}</h1>
        {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{subtitle}</p>}
        <div className="mt-7">{children}</div>
      </div>

      <div className="mt-10 flex items-center justify-between">
        {onBack ? (
          <Button variant="ghost" onClick={onBack} icon={<ArrowLeft className="h-4 w-4" />}>
            Prapa
          </Button>
        ) : (
          <span />
        )}
        <Button onClick={onNext} disabled={nextDisabled} iconRight={nextIcon}>
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}
