"use client";

import Link from "next/link";

export function PromoCard({
  title,
  subtitle,
  ctaLabel,
  href,
}: {
  title: string;
  subtitle: string;
  ctaLabel: string;
  href: string;
}) {
  return (
    <div className="flex min-h-[var(--hub-promo-h)] w-full max-w-[var(--hub-promo-w)] items-center justify-center rounded-maro20 bg-surface px-6 py-8 sm:h-[var(--hub-promo-h)] sm:px-8">
      <div className="flex w-full flex-col items-center justify-center text-center">
        <div className="text-[clamp(28px,4vw,36px)] font-bold leading-[1.1] tracking-brand text-ink">
          {title}
        </div>
        <p className="mt-3 text-[15px] text-ink-2">{subtitle}</p>
        <Link
          href={href}
          className="cta-gradient mt-5 inline-flex h-11 shrink-0 items-center rounded-maro12 px-5 text-[14px] font-semibold tracking-brand transition-opacity hover:opacity-90"
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
