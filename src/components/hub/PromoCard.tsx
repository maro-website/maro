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
    <div className="flex h-[178px] w-full max-w-[487px] flex-col justify-between rounded-maro16 border border-line bg-surface p-6 sm:flex-row sm:items-end">
      <div>
        <div className="text-[clamp(28px,4vw,36px)] font-bold leading-[1.1] tracking-brand text-ink">
          {title}
        </div>
        <p className="mt-2 text-[15px] text-ink-2">{subtitle}</p>
      </div>
      <Link
        href={href}
        className="cta-gradient mt-4 inline-flex h-[39px] shrink-0 items-center rounded-full px-5 text-[14px] font-semibold tracking-brand transition-opacity hover:opacity-90 sm:mt-0"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
