"use client";

import * as React from "react";
import Link from "next/link";
import { Logo, MaroSymbol } from "@/components/ui/Logo";

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
    <div className="grid min-h-screen gap-[30px] bg-canvas lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:p-[30px]">
      {/* Form side */}
      <div className="flex min-h-screen flex-col bg-surface px-[20px] py-[30px] sm:px-[30px] lg:min-h-[calc(100vh-60px)] lg:rounded-maro24">
        <Link href="/" className="inline-flex">
          <Logo mobileLockup />
        </Link>
        <div className="flex flex-1 items-center justify-center py-[30px]">
          <div className="w-full max-w-sm animate-fade-up">
            <h1 className="text-[clamp(32px,5vw,48px)] font-bold leading-[1.04] tracking-brand text-ink">{title}</h1>
            <p className="mt-[10px] text-[15px] leading-relaxed text-ink-2">{subtitle}</p>
            <div className="mt-[30px]">{children}</div>
          </div>
        </div>
        <div className="text-center text-[12.5px] text-ink-3">
          maro.al · Powered by NICE.al
        </div>
      </div>

      {/* Brand side */}
      <div className="relative hidden overflow-hidden lg:block">
        <div className="relative flex h-full flex-col justify-between p-[30px] xl:p-[60px]">
          <div className="flex items-center gap-[10px] text-brand">
            <MaroSymbol className="h-10 w-10" />
            <span className="text-[14px] font-semibold">maro.al</span>
          </div>
          <div className="py-16">
            <span className="mb-[30px] block text-[13px] font-semibold text-brand">Krejt tools-at me ni vend.</span>
            <p className="max-w-xl text-balance text-[clamp(44px,5vw,76px)] font-bold leading-[0.98] tracking-brand text-ink">
              Trego çka të duhet.
              <br />
              <span className="text-brand">maro e maron.</span>
            </p>
            <p className="mt-[20px] max-w-md text-[16px] leading-relaxed text-ink-2">
              Bashkohu me bizneset që e ndërtojnë praninë e tyre online në minuta, jo javë.
            </p>
          </div>
          <p className="text-[13px] font-medium text-ink-3">2,400+ krijime të maruara</p>
        </div>
      </div>
    </div>
  );
}
