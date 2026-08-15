"use client";

import Link from "next/link";

export function MarketingBanner() {
  return (
    <div className="flex w-full max-w-[1004px] flex-col overflow-hidden rounded-maro16 border border-line bg-surface lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:px-10 lg:py-8">
      <div className="flex flex-col gap-4 p-6 lg:max-w-[420px] lg:p-0">
        <h2 className="text-[clamp(28px,4vw,40px)] font-bold leading-[1.1] tracking-brand text-ink">
          maroMarketing
        </h2>
        <p className="text-[16px] text-ink-2">Prej produktit te kampanja.</p>
        <Link
          href="/marketing"
          className="cta-gradient inline-flex h-[39px] w-fit items-center rounded-full px-5 text-[14px] font-semibold tracking-brand transition-opacity hover:opacity-90"
        >
          maro tash
        </Link>
      </div>
      <div className="relative flex min-h-[200px] flex-1 items-end justify-center overflow-hidden bg-canvas px-6 pb-6 lg:min-h-[280px] lg:justify-end lg:bg-transparent lg:p-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hub/marketing-stack.png"
          alt=""
          className="max-h-[280px] w-auto max-w-full object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <div className="pointer-events-none absolute inset-0 hidden items-center justify-center lg:flex">
          <div className="h-48 w-72 rounded-maro16 bg-brand/10" aria-hidden />
        </div>
      </div>
    </div>
  );
}
