"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useMaro } from "@/context/store";
import {
  PLAN_PACKAGES,
  TOPUP_TIERS,
  formatEur,
  creditsPerEuro,
  type CheckoutItemId,
} from "@/lib/credits/money";
import { Check, Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Tab = "plans" | "topup";

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
  const { user, profile, ready } = useMaro();
  const hasPlan = Boolean(profile?.maro_plan);

  const initialTab = searchParams.get("tab") === "topup" ? "topup" : "plans";
  const [tab, setTab] = React.useState<Tab>(initialTab);

  React.useEffect(() => {
    const t = searchParams.get("tab") === "topup" ? "topup" : "plans";
    setTab(t);
  }, [searchParams]);

  const setTabAndUrl = (next: Tab) => {
    setTab(next);
    router.replace(next === "topup" ? "/pricing?tab=topup" : "/pricing", { scroll: false });
  };

  const goCheckout = (itemId: CheckoutItemId) => {
    if (!user) {
      router.push(`/sign-in?next=${encodeURIComponent(`/checkout?item=${itemId}`)}`);
      return;
    }
    router.push(`/checkout?item=${itemId}`);
  };

  return (
    <AppShell showFooter>
      <div className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="max-w-2xl">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-brand">Planet maro</p>
          <h1 className="mt-2 text-[clamp(32px,6vw,48px)] font-light tracking-[-0.03em] text-ink">
            Zgjidh planin tënd
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
            Blerje njëherëshe — pa abonim mujor. Kreditet nuk skadojnë. Pagesa e sigurt përmes Raiffeisen
            Bank Kosova.
          </p>
        </div>

        <div className="mt-10 inline-flex rounded-xl bg-surface-2 p-1">
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
                "flex items-center gap-2 rounded-lg px-5 py-2.5 text-[14px] font-semibold transition-all",
                tab === t.id ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink-2"
              )}
            >
              {t.id === "topup" && !hasPlan && ready && user && (
                <Lock className="h-3.5 w-3.5" />
              )}
              {t.label}
            </button>
          ))}
        </div>

        {tab === "plans" && (
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {PLAN_PACKAGES.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-2xl border bg-surface p-6 sm:p-7",
                  plan.badge ? "border-brand/40 shadow-[0_0_0_1px_rgba(90,40,229,0.15)]" : "border-line"
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
                  <div className="mt-6 text-[28px] font-light tracking-[-0.03em] text-ink">
                    Marrëveshje
                  </div>
                ) : (
                  <div className="mt-6 flex items-baseline gap-2">
                    <span className="text-[36px] font-light tracking-[-0.03em] text-ink">
                      {formatEur(plan.priceEur)}
                    </span>
                    <span className="text-[14px] text-ink-3">
                      · {plan.credits} kredite
                    </span>
                  </div>
                )}

                <ul className="mt-6 flex flex-1 flex-col gap-2.5">
                  {plan.features.map((f) => (
                    <li key={f.text} className="flex items-start gap-2.5 text-[14px] text-ink-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      {f.text}
                    </li>
                  ))}
                </ul>

                {plan.contactOnly ? (
                  <Link
                    href="/contact"
                    className="mt-8 flex h-11 items-center justify-center rounded-2xl bg-surface-2 text-[14px] font-semibold text-ink transition-colors hover:bg-line"
                  >
                    Na kontakto
                  </Link>
                ) : (
                  <Button
                    className="mt-8 w-full"
                    onClick={() => goCheckout(plan.checkoutId)}
                  >
                    Bli tani
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "topup" && (
          <div className="mt-10">
            {!hasPlan && ready && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-line bg-surface-2 px-5 py-4">
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
              {TOPUP_TIERS.map((tier) => {
                const locked = !hasPlan;
                return (
                  <div
                    key={tier.id}
                    className={cn(
                      "flex flex-col rounded-2xl border bg-surface p-5",
                      locked ? "border-line opacity-60" : "border-line"
                    )}
                  >
                    <p className="text-[24px] font-light tracking-[-0.02em] text-ink">
                      {tier.credits.toLocaleString("de-DE")}
                    </p>
                    <p className="text-[13px] text-ink-3">kredite</p>
                    <p className="mt-4 text-[22px] font-semibold text-ink">{formatEur(tier.priceEur)}</p>
                    <p className="mt-1 text-[12px] text-ink-3">
                      {creditsPerEuro(tier.priceEur, tier.credits)} kr/€
                      {tier.discountPct ? ` · −${tier.discountPct}%` : ""}
                    </p>
                    <Button
                      className="mt-5 w-full"
                      variant={locked ? "secondary" : "primary"}
                      disabled={locked}
                      onClick={() => goCheckout(tier.id)}
                    >
                      {locked ? "I kyçur" : "Rimbush"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="mt-12 text-center text-[13px] text-ink-3">
          Çmimi bazë: €0,09/kredit · Blerja minimale €9 ·{" "}
          <Link href="/legal/refund" className="font-semibold text-ink-2 hover:text-ink">
            Politika e rimbursimit
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
