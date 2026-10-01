"use client";

import * as React from "react";
import Link from "next/link";
import { fetchPrompts } from "@/lib/services/promptsService";
import type { PromptItem } from "@/lib/prompts/types";

export function RecentPresets() {
  const [items, setItems] = React.useState<PromptItem[]>([]);

  React.useEffect(() => {
    let alive = true;
    void fetchPrompts().then((result) => {
      if (!alive) return;
      setItems(result.items.filter((item) => Boolean(item.featured_url)).slice(0, 8));
    });
    return () => {
      alive = false;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="w-full max-w-[var(--hub-banner-max)] pt-4 sm:pt-8" aria-labelledby="recent-presets-title">
      <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
        <h2 id="recent-presets-title" className="text-[clamp(30px,4vw,42px)] font-bold leading-none tracking-brand text-ink">
          Presetat e fundit
        </h2>
        <Link href="/prompts" className="inline-flex min-h-11 items-center rounded-maro12 px-3 text-[14px] font-semibold text-brand hover:bg-surface">
          Shiko krejt
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.id}
            href="/prompts"
            className="group relative aspect-[4/5] overflow-hidden rounded-maro20 bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            aria-label={`Hap maroPreset ${item.code}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.featured_url!}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
