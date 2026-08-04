"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Check, Clock } from "lucide-react";
import {
  isMaroHeretEligible,
  isMaroHeretOfferActive,
  maroHeretCountdown,
} from "@/lib/promos/maroHeret";

const EASE = [0.22, 1, 0.36, 1] as const;

const PERKS = [
  "maroFort mode falas deri më 1 shtator 2026",
  "Beta maroArt 1.0 pa limit",
  "Akses i hershëm në veçoritë e reja",
];

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-w-[3.25rem] flex-col items-center rounded-2xl bg-canvas px-2.5 py-2.5 sm:min-w-[4rem] sm:px-3">
      <span className="text-[22px] font-extrabold tabular-nums tracking-tight text-ink sm:text-[28px]">
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-3 sm:text-[11px]">
        {label}
      </span>
    </div>
  );
}

export function MaroHeretCard({
  user,
  hasFort,
}: {
  user: { createdAt?: string } | null;
  hasFort: boolean;
}) {
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!isMaroHeretOfferActive(now)) return null;

  const countdown = maroHeretCountdown(now);
  const eligible = user ? isMaroHeretEligible(user.createdAt, now) : null;
  const active = Boolean(user && eligible && hasFort);

  return (
    <motion.div
      id="maro-heret"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE, delay: 0.06 }}
      className="mt-8 scroll-mt-24 overflow-hidden rounded-3xl bg-brand p-[1px]"
    >
      <div className="rounded-[23px] bg-surface p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-brand-fg">
                <Sparkles className="h-3.5 w-3.5" /> maroHerët
              </span>
              {active && (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ink">
                  <Check className="h-3 w-3" /> Aktiv
                </span>
              )}
            </div>
            <h2 className="mt-4 text-[24px] font-extrabold tracking-[-0.02em] text-ink">
              maroFort falas për të parët
            </h2>
            <p className="mt-2 max-w-lg text-[14px] leading-relaxed text-ink-2">
              Regjistrohu brenda muajit <strong className="text-ink">gusht 2026</strong> dhe merr{" "}
              <strong className="text-ink">maroFort</strong> pa pagesë deri më{" "}
              <strong className="text-ink">1 shtator 2026</strong>. Oferta vlen vetëm për llogari të reja
              të krijuara në gusht.
            </p>
            <ul className="mt-4 space-y-2">
              {PERKS.map((perk) => (
                <li key={perk} className="flex items-center gap-2 text-[14px] text-ink">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-brand-fg">
                    <Check className="h-3 w-3" />
                  </span>
                  {perk}
                </li>
              ))}
            </ul>
            {!user && (
              <Link
                href="/sign-up"
                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-brand px-5 py-3 text-[14px] font-semibold text-brand-fg transition-colors hover:bg-brand-hover"
              >
                Regjistrohu tani
              </Link>
            )}
            {user && eligible === false && (
              <p className="mt-4 text-[13px] text-ink-3">
                Llogaria jote nuk u krijua në gusht 2026, prandaj nuk përfiton nga maroHerët.
              </p>
            )}
            {user && eligible && !hasFort && (
              <p className="mt-4 text-[13px] font-medium text-ink-2">
                Je i kualifikuar. maroFort aktivizohet automatikisht për llogarinë tënde.
              </p>
            )}
          </div>

          <div className="w-full shrink-0 sm:w-auto">
            <div className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
              <Clock className="h-3.5 w-3.5" /> Mbaron pas
            </div>
            <div className="mt-3 flex gap-2">
              <CountdownUnit value={countdown.days} label="ditë" />
              <CountdownUnit value={countdown.hours} label="orë" />
              <CountdownUnit value={countdown.minutes} label="min" />
              <CountdownUnit value={countdown.seconds} label="sek" />
            </div>
            {countdown.expired && (
              <p className="mt-2 text-[12px] font-semibold text-ink-3">Oferta ka mbaruar.</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
