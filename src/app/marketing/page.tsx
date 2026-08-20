"use client";

import { AppShell } from "@/components/app/AppShell";
import { Megaphone } from "lucide-react";
import Link from "next/link";

/** Marketing Studio stub — full tool deferred. */
export default function MarketingStudioPage() {
  return (
    <AppShell>
      <div className="grid h-full place-items-center px-6">
        <div className="max-w-md rounded-maro16 bg-surface px-8 py-16 text-center">
          <Megaphone className="mx-auto h-12 w-12 text-brand" />
          <h1 className="mt-4 text-[22px] font-bold tracking-brand text-ink">maroMarketing</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
            Studio marketing për produkt → kampanjë vjen së shpejti.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex h-11 items-center rounded-xl bg-ink px-5 text-[14px] font-bold text-white"
          >
            Kthehu te Ballina
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
