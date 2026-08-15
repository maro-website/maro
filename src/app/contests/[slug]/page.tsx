"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { fetchContest, fetchContestSubmissions } from "@/lib/services/contestService";
import type { ContestItem, ContestSubmission } from "@/lib/contests/types";
import { cn } from "@/lib/utils/cn";

export default function ContestDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params);
  const router = useRouter();
  const [contest, setContest] = React.useState<ContestItem | null>(null);
  const [subs, setSubs] = React.useState<ContestSubmission[]>([]);

  React.useEffect(() => {
    void fetchContest(slug).then((c) => {
      setContest(c);
      if (c) void fetchContestSubmissions(c.id).then(setSubs);
    });
  }, [slug]);

  if (!contest) {
    return (
      <AppShell>
        <div className="grid h-full place-items-center text-[14px] text-ink-3">Duke ngarkuar…</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[900px] px-4 py-10 sm:px-6">
        <button
          type="button"
          onClick={() => router.push("/contests")}
          className="text-[14px] font-semibold text-brand hover:underline"
        >
          ← Kontestet
        </button>
        <h1 className="mt-4 text-[28px] font-bold tracking-brand text-ink">{contest.title}</h1>
        <p className="mt-2 text-[15px] text-ink-2">{contest.description}</p>
        <p className="mt-1 text-[14px] font-semibold text-brand">{contest.prize_label}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/krijimet"
            className="inline-flex h-11 items-center rounded-xl bg-ink px-5 text-[14px] font-bold text-white hover:opacity-90"
          >
            Zgjidh krijimin tënd
          </Link>
        </div>

        <h2 className="mt-10 text-[13px] font-bold uppercase tracking-wider text-ink-3">
          Dorëzimet
        </h2>
        {subs.length === 0 ? (
          <p className="mt-4 text-[14px] text-ink-3">Ende pa dorëzime.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {subs.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "overflow-hidden rounded-maro16 border border-line bg-surface",
                  s.winner && "ring-2 ring-brand"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.url} alt="" className="aspect-square w-full object-cover" />
                <div className="p-2">
                  <p className="truncate text-[12px] font-semibold text-ink">{s.author}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
