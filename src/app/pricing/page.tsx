"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/Badge";
import { formatEur } from "@/lib/credits/money";
import { formatCredits } from "@/lib/credits/format";
import { Check, Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Tab = "plans" | "topup";

type CatalogPlan = {
  id: string;
  name: string;
  tagline: string;
  priceEur: number;
  credits: number;
  badge?: string | null;
  contactOnly?: boolean;
  features: string[];
};

type CatalogTopup = {
  id: string;
  credits: number;
  priceEur: number;
  discountPct?: number;
};

export default function PricingPage() {
  return (
    <React.Suspense fallback={null}>
      <PricingPageInner />
    </React.Suspense>
  );
}

function PricingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [catalog, setCatalog] = React.useState<{
    plans: CatalogPlan[];
    topups: CatalogTopup[];
    listPriceEurPerCredit: number;
  } | null>(null);
  const initialTab = searchParams.get("tab") === "topup" ? "topup" : "plans";
  const [tab, setTab] = React.useState<Tab>(initialTab);

  React.useEffect(() => {
    fetch("/api/commerce/catalog")
      .then((r) => r.json())
      .then((data) => setCatalog(data))
      .catch(() => null);
  }, []);

  React.useEffect(() => {
    const t = searchParams.get("tab") === "topup" ? "topup" : "plans";
    setTab(t);
  }, [searchParams]);

  const setTabAndUrl = (next: Tab) => {
    setTab(next);
    router.replace(next === "topup" ? "/pricing?tab=topup" : "/pricing", { scroll: false });
  };

  const plans = catalog?.plans ?? [];
  const topups = catalog?.topups ?? [];

  return (
    <AppShell showFooter>
      <div className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">Planet maro</p>
          <h1 className="mt-2 maro-text-h1 font-bold tracking-brand text-ink">
            Planet maro
          </h1>
          <p className="mt-3 text-base leading-relaxed text-ink-2">
            Katalogu i planeve dhe krediteve. Blerjet e reja janë të mbyllura në këtë version; plani ekzistues shfaqet te llogaria.
          </p>
        </div>

        <div className="mt-10 inline-flex rounded-maro12 bg-surface-2 p-1">
          {(
            [
              { id: "plans" as const, label: "Planet" },
              { id: "topup" as const, label: "Top-up" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTabAndUrl(t.id)}
              className={cn(
                "flex items-center gap-2 rounded-maro8 px-5 py-2.5 text-[14px] font-semibold transition-all",
                tab === t.id ? "bg-surface text-ink" : "text-ink-3 hover:text-ink-2"
              )}
            >
              {t.id === "topup" && (
                <Lock className="h-3.5 w-3.5" />
              )}
              {t.label}
            </button>
          ))}
        </div>

        {tab === "plans" && (
          <>
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-maro16 bg-surface p-8",
                  plan.badge && "bg-surface"
                )}
                >
                  {plan.badge && (
                    <Badge tone="brand" className="absolute -top-3 left-6 text-[11px]">
                      {plan.badge}
                    </Badge>
                  )}
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-brand" />
                    <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">{plan.name}</h2>
                  </div>
                  <p className="mt-1 text-[14px] text-ink-2">{plan.tagline}</p>

                  <p className="mt-5 text-[36px] font-bold tracking-brand text-ink">
                    {plan.contactOnly ? "Sipas marrëveshjes" : formatEur(plan.priceEur)}
                  </p>

                  <ul className="mt-6 flex flex-1 flex-col gap-2.5">
                    {plan.features.map((text) => (
                      <li key={text} className="flex items-start gap-2.5 text-[14px] text-ink-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                        {text.startsWith("Top-up") ? "Blerjet e reja janë të mbyllura" : text}
                      </li>
                    ))}
                  </ul>

                  <p className="mt-8 text-sm text-ink-3">Blerjet janë të mbyllura.</p>
                </div>
              ))}
            </div>

            <div className="mt-12 rounded-maro16 bg-surface p-6">
              <h3 className="text-[16px] font-semibold text-ink">Krahasim i shkurtër</h3>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border-subtle text-ink-3">
                      <th className="py-2 pr-4 font-semibold"> </th>
                      <th className="py-2 pr-4 font-semibold">maroStandard</th>
                      <th className="py-2 pr-4 font-semibold">maroPro</th>
                      <th className="py-2 font-semibold">maroBiz</th>
                    </tr>
                  </thead>
                  <tbody className="text-ink-2">
                    {[
                      ["Kredite", "100", "500", "Sipas nevojës"],
                      ["Kohëzgjatja", "30 ditë", "30 ditë", "Sipas marrëveshjes"],
                      ["Kreditet skadojnë?", "Jo", "Jo", "Jo"],
                      ["Workspaces", "1", "Deri në 5", "Sipas nevojës"],
                      ["Gjenerime njëkohësisht", "1", "Deri në 3", "Sipas marrëveshjes"],
                      ["Top-up", "I mbyllur", "I mbyllur", "I mbyllur"],
                    ].map(([label, ...vals]) => (
                      <tr key={label} className="border-b border-border-subtle/60">
                        <td className="py-2.5 pr-4 font-medium text-ink">{label}</td>
                        {vals.map((v, i) => (
                          <td key={i} className="py-2.5 pr-4">
                            {v}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-10 space-y-4">
              <h3 className="text-[16px] font-semibold text-ink">Pyetje të shpeshta</h3>
              {[
                {
                  q: "A është ky abonim automatik?",
                  a: "Blerjet e reja janë të mbyllura. Për një plan ekzistues, mënyra e rinovimit dhe afati shfaqen te llogaria.",
                },
                {
                  q: "A skadojnë kreditet?",
                  a: "Jo. Kreditet mbeten në llogarinë tënde edhe pas skadimit të planit.",
                },
                {
                  q: "Kur mund ta rinovoj planin?",
                  a: "Rinovimet manuale janë të mbyllura. Një abonim ekzistues me rinovim automatik vazhdon sipas kushteve të tij.",
                },
                {
                  q: "A mund të blej vetëm kredite?",
                  a: "Blerjet e reja të krediteve janë të mbyllura në këtë version.",
                },
              ].map((item) => (
                <div key={item.q} className="rounded-maro12 bg-surface px-5 py-4">
                  <p className="text-[14px] font-semibold text-ink">{item.q}</p>
                  <p className="mt-1 text-[14px] text-ink-2">{item.a}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "topup" && (
          <div className="mt-10">
            {(
              <div className="mb-8 flex items-start gap-3 rounded-maro16 bg-surface-2 px-5 py-4">
                <Lock className="mt-0.5 h-5 w-5 shrink-0 text-ink-3" />
                <div>
                  <p className="text-base font-semibold text-ink">Blerjet janë të mbyllura</p>
                  <p className="mt-1 text-[14px] text-ink-2">
                    Katalogu mbetet i dukshëm; kreditet dhe plani ekzistues ruhen.
                  </p>
                  <button
                    type="button"
                    onClick={() => setTabAndUrl("plans")}
                    className="mt-3 text-[14px] font-semibold text-brand hover:underline"
                  >
                    Shiko planet →
                  </button>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {topups.map((tier) => {
                const locked = false;
                return (
                  <div
                    key={tier.id}
                    className={cn(
                      "flex flex-col rounded-maro16 bg-surface p-6",
                      locked && "opacity-60"
                    )}
                  >
                    <p className="text-[24px] font-bold tracking-brand text-ink">
                      {formatCredits(tier.credits)}
                    </p>
                    <p className="text-sm text-ink-3">kredite</p>
                    <p className="mt-4 text-[22px] font-semibold text-ink">{formatEur(tier.priceEur)}</p>
                    {tier.discountPct ? (
                      <p className="mt-1 text-[12px] text-ink-3">−{tier.discountPct}% nga çmimi bazë</p>
                    ) : null}
                    <p className="mt-5 text-sm text-ink-3">Blerjet janë të mbyllura.</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="mt-12 text-center text-sm text-ink-3">
          Vlera bazë e katalogut: €0,09/kredit ·{" "}
          <Link href="/legal/refund" className="font-semibold text-ink-2 hover:text-ink">
            Politika e rimbursimit
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
