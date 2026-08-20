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
    <div className="flex min-h-[var(--hub-promo-h)] w-full max-w-[var(--hub-promo-w)] flex-col justify-between rounded-maro20 bg-surface p-7 sm:h-[var(--hub-promo-h)] sm:flex-row sm:items-end sm:p-8">
      <div>
        <div className="text-[clamp(28px,4vw,36px)] font-bold leading-[1.1] tracking-brand text-ink">
          {title}
        </div>
        <p className="mt-3 text-[15px] text-ink-2">{subtitle}</p>
      </div>
      <Link
        href={href}
        className="cta-gradient mt-6 inline-flex h-11 shrink-0 items-center rounded-maro12 px-5 text-[14px] font-semibold tracking-brand transition-opacity hover:opacity-90 sm:mt-0"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
