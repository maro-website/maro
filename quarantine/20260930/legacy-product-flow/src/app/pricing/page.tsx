"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useMaro } from "@/context/store";
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
  const { user, ready } = useMaro();

  const [catalog, setCatalog] = React.useState<{
    plans: CatalogPlan[];
    topups: CatalogTopup[];
    listPriceEurPerCredit: number;
  } | null>(null);
  const [canTopUp, setCanTopUp] = React.useState(false);
  const [renewalAvailable, setRenewalAvailable] = React.useState(false);
  const [planExpired, setPlanExpired] = React.useState(false);

  const initialTab = searchParams.get("tab") === "topup" ? "topup" : "plans";
  const [tab, setTab] = React.useState<Tab>(initialTab);

  React.useEffect(() => {
    fetch("/api/commerce/catalog")
      .then((r) => r.json())
      .then((data) => setCatalog(data))
      .catch(() => null);
  }, []);

  React.useEffect(() => {
    if (!user) return;
    fetch("/api/commerce/entitlements")
      .then((r) => r.json())
      .then((data) => {
        setCanTopUp(Boolean(data.entitlements?.can_top_up));
        setRenewalAvailable(Boolean(data.entitlements?.renewal_available));
        setPlanExpired(
          data.entitlements?.plan_status === "EXPIRED" ||
            data.entitlements?.plan_status === "NO_PLAN"
        );
      })
      .catch(() => null);
  }, [user]);

  React.useEffect(() => {
    const t = searchParams.get("tab") === "topup" ? "topup" : "plans";
    setTab(t);
  }, [searchParams]);

  const setTabAndUrl = (next: Tab) => {
    setTab(next);
    router.replace(next === "topup" ? "/pricing?tab=topup" : "/pricing", { scroll: false });
  };

  const promoParam = searchParams.get("promo")?.trim() ?? "";

  const goCheckout = (itemId: string) => {
    const promoQs = promoParam ? `&promo=${encodeURIComponent(promoParam)}` : "";
    if (!user) {
      router.push(
        `/sign-in?next=${encodeURIComponent(`/checkout?item=${itemId}${promoParam ? `&promo=${encodeURIComponent(promoParam)}` : ""}`)}`
      );
      return;
    }
    router.push(`/checkout?item=${itemId}${promoQs}`);
  };

  const plans = catalog?.plans ?? [];
  const topups = catalog?.topups ?? [];

  return (
    <AppShell showFooter>
      <div className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="max-w-2xl">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-brand">Planet maro</p>
          <h1 className="mt-2 text-[clamp(32px,6vw,48px)] font-bold tracking-brand text-ink">
            Zgjidh planin tënd
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
            Plan 30-ditor. Pagesë njëherëshe, pa rinovim automatik. Kreditet nuk skadojnë.
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
              {t.id === "topup" && !canTopUp && ready && user && (
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

                  {plan.contactOnly ? (
                    <div className="mt-6 text-[28px] font-bold tracking-brand text-ink">
                      Marrëveshje
                    </div>
                  ) : (
                    <div className="mt-6 flex items-baseline gap-2">
                      <span className="text-[36px] font-bold tracking-brand text-ink">
                        {formatEur(plan.priceEur)}
                      </span>
                      <span className="text-[14px] text-ink-3">· {plan.credits} kredite</span>
                    </div>
                  )}

                  <ul className="mt-6 flex flex-1 flex-col gap-2.5">
                    {plan.features.map((text) => (
                      <li key={text} className="flex items-start gap-2.5 text-[14px] text-ink-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                        {text}
                      </li>
                    ))}
                  </ul>

                  {plan.contactOnly ? (
                    <Link
                      href="/contact"
                      className="mt-8 flex h-11 items-center justify-center rounded-maro12 bg-surface-2 text-[14px] font-semibold text-ink transition-colors hover:bg-surface-hover"
                    >
                      Na kontakto
                    </Link>
                  ) : renewalAvailable && plan.id !== "business" ? (
                    <Button className="mt-8 w-full" onClick={() => goCheckout("renew")}>
                      Rinovo planin
                    </Button>
                  ) : (
                    <Button className="mt-8 w-full" onClick={() => goCheckout(plan.id)}>
                      {planExpired ? "Aktivizo planin" : "Aktivizo planin"}
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-12 rounded-maro16 bg-surface p-6">
              <h3 className="text-[16px] font-semibold text-ink">Krahasim i shkurtër</h3>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-[13px]">
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
                      ["Top-up", "Po", "Po", "Po"],
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
                  a: "Jo. Planet paguhen një herë dhe zgjasin 30 ditë. Nuk ka pagesë të përsëritur automatikisht.",
                },
                {
                  q: "A skadojnë kreditet?",
                  a: "Jo. Kreditet mbeten në llogarinë tënde edhe pas skadimit të planit.",
                },
                {
                  q: "Kur mund ta rinovoj planin?",
                  a: "Gjatë 7 ditëve të fundit para skadimit.",
                },
                {
                  q: "A mund të blej vetëm kredite?",
                  a: "Top-up kërkon plan aktiv (maroStandard ose maroPro).",
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
            {!canTopUp && ready && (
              <div className="mb-8 flex items-start gap-3 rounded-maro16 bg-surface-2 px-5 py-4">
                <Lock className="mt-0.5 h-5 w-5 shrink-0 text-ink-3" />
                <div>
                  <p className="text-[15px] font-semibold text-ink">Top-up kërkon plan aktiv</p>
                  <p className="mt-1 text-[14px] text-ink-2">
                    Bli maroStandard ose maroPro fillimisht për të rimbushur kredite me çmime të
                    preferuara.
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
                const locked = !canTopUp;
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
                    <p className="text-[13px] text-ink-3">kredite</p>
                    <p className="mt-4 text-[22px] font-semibold text-ink">{formatEur(tier.priceEur)}</p>
                    {tier.discountPct ? (
                      <p className="mt-1 text-[12px] text-ink-3">−{tier.discountPct}% nga çmimi bazë</p>
                    ) : null}
                    <Button
                      className="mt-5 w-full"
                      variant={locked ? "secondary" : "primary"}
                      disabled={locked}
                      onClick={() => goCheckout(tier.id)}
                    >
                      {locked ? "I kyçur" : "Blej Top-up"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="mt-12 text-center text-[13px] text-ink-3">
          Vlera bazë: €0,09/kredit · Blerja minimale €9 ·{" "}
          <Link href="/legal/refund" className="font-semibold text-ink-2 hover:text-ink">
            Politika e rimbursimit
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
