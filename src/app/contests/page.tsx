"use client";

import * as React from "react";
import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { fetchContests } from "@/lib/services/contestService";
import type { ContestItem } from "@/lib/contests/types";
import { cn } from "@/lib/utils/cn";
import { Trophy } from "lucide-react";

function ContestCard({ contest }: { contest: ContestItem }) {
  const open = contest.status === "open";
  return (
    <article className="overflow-hidden rounded-maro16 border border-line bg-surface">
      <div
        className="relative flex min-h-[200px] items-end bg-ink p-6 sm:min-h-[240px]"
        style={
          contest.cover_url
            ? { backgroundImage: `url(${contest.cover_url})`, backgroundSize: "cover" }
            : undefined
        }
      >
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent" />
        <div className="relative z-10 w-full">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold",
              open ? "bg-brand text-brand-fg" : "bg-surface/20 text-white"
            )}
          >
            {open ? "Kontest i hapur" : "Njoftuar"}
          </span>
          <h2 className="mt-3 text-[22px] font-bold tracking-brand text-white">{contest.title}</h2>
          <p className="mt-1 text-[14px] text-white/80">{contest.prize_label}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="max-w-lg text-[14px] text-ink-2">{contest.description}</p>
        <Link
          href={`/contests/${contest.slug}`}
          className="inline-flex h-11 shrink-0 items-center rounded-xl bg-ink px-5 text-[14px] font-bold text-white hover:opacity-90"
        >
          {open ? "Bashkohu" : "Mëso më shumë"}
        </Link>
      </div>
    </article>
  );
}

export default function ContestsPage() {
  const [contests, setContests] = React.useState<ContestItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    void fetchContests().then((items) => {
      setContests(items);
      setLoading(false);
    });
  }, []);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[900px] px-4 py-10 sm:px-6">
        <div className="flex items-center gap-2 text-brand">
          <Trophy className="h-6 w-6" />
          <h1 className="text-[28px] font-bold tracking-brand text-ink">maro Kontestet</h1>
        </div>
        <p className="mt-2 text-[15px] text-ink-2">
          Hyr në kontestet, dërgo krijimet dhe konkurro me kreatorë nga e gjithë Shqipëria.
        </p>

        <h2 className="mt-8 text-[13px] font-bold uppercase tracking-wider text-ink-3">
          Kontestet aktive
        </h2>

        {loading ? (
          <p className="mt-6 text-[14px] text-ink-3">Duke ngarkuar…</p>
        ) : contests.length === 0 ? (
          <div className="mt-6 rounded-maro16 border border-line bg-surface px-6 py-12 text-center">
            <p className="text-[15px] font-semibold text-ink">Asnjë kontest aktiv ende</p>
            <p className="mt-2 text-[14px] text-ink-2">Kontestet e reja do të shfaqen këtu së shpejti.</p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {contests.map((c) => (
              <ContestCard key={c.id} contest={c} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
