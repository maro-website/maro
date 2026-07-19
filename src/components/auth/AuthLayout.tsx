"use client";

import * as React from "react";
import Link from "next/link";
import { Logo, MaroSymbol } from "@/components/ui/Logo";
import { Sparkles } from "lucide-react";

export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <Link href="/" className="inline-flex">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm animate-fade-up">
            <h1 className="text-[28px] font-extrabold tracking-[-0.03em] text-ink">{title}</h1>
            <p className="mt-2 text-[14.5px] text-ink-2">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>
        <div className="text-center text-[12.5px] text-ink-3">
          MARO Beta Version · maro.al
        </div>
      </div>

      {/* Brand side — always a dark showcase, independent of app theme */}
      <div className="relative hidden overflow-hidden bg-[#131316] lg:block">
        <div className="absolute inset-0 bg-grid opacity-[0.09]" />
        <div className="absolute -right-24 top-1/4 h-96 w-96 rounded-full bg-brand/40 blur-3xl" />
        <div className="absolute -left-16 bottom-10 h-80 w-80 rounded-full bg-brand/20 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-2 text-white/80">
            <MaroSymbol className="h-8 w-8" />
            <span className="text-[13px] font-semibold uppercase tracking-widest">maro.al</span>
          </div>
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[12px] font-medium text-white/80">
              <Sparkles className="h-3.5 w-3.5" /> Website me AI
            </div>
            <p className="max-w-md text-balance text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
              Trego çka të duhet.
              <br />
              <span className="text-brand/90" style={{ color: "#b79cff" }}>Maro e maron.</span>
            </p>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-white/60">
              Bashkohu me bizneset që e ndërtojnë praninë e tyre online në minuta, jo javë.
            </p>
          </div>
          <div className="flex items-center gap-3 text-white/50">
            <div className="flex -space-x-2">
              {["#5a28e5", "#0ea5b7", "#ea580c", "#12a150"].map((c) => (
                <span key={c} className="h-8 w-8 rounded-full border-2 border-ink" style={{ background: c }} />
              ))}
            </div>
            <span className="text-[13px]">2,400+ website të maruara</span>
          </div>
        </div>
      </div>
    </div>
  );
}
