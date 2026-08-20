"use client";

export function MarketingBanner() {
  return (
    <div className="flex w-full max-w-[var(--hub-banner-max)] min-h-[var(--hub-banner-min-h)] flex-col overflow-hidden rounded-maro20 bg-surface lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:px-10 lg:py-8">
      <div className="flex flex-col gap-4 p-7 sm:p-8 lg:max-w-[420px] lg:p-0">
        <h2 className="text-[clamp(28px,4vw,40px)] font-bold leading-[1.1] tracking-brand text-ink">
          maroMarketing
        </h2>
        <p className="text-[16px] text-ink-2">Prej produktit te kampanja.</p>
        <span className="inline-flex h-11 w-fit items-center rounded-maro12 bg-surface-2 px-5 text-[14px] font-semibold tracking-brand text-ink-3">
          Së shpejti
        </span>
      </div>
      <div className="relative flex min-h-[220px] flex-1 items-end justify-center overflow-hidden px-6 pb-0 lg:min-h-[var(--hub-banner-min-h)] lg:justify-end lg:p-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hub/marketing-stack.png"
          alt=""
          className="max-h-[300px] w-auto max-w-full object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
    </div>
  );
}
