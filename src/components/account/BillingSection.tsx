"use client";
import { rateLimitedFetch as fetch } from "@/lib/client/rateLimit";

import * as React from "react";
import { Badge } from "@/components/ui/Badge";
import { useMaro } from "@/context/store";
import { formatOrderDate } from "@/lib/payments/orderDisplay";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import { useRaiAcceptAvailability } from "@/lib/payments/useRaiAcceptAvailability";
import type { CommerceEntitlementsState } from "@/lib/commerce/useCommerceEntitlements";
import type { CreditUsage } from "@/lib/credits/usage";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Plan aktiv",
  RENEWAL_WINDOW: "Rinovimi i disponueshëm",
  EXPIRED: "Plani ka skaduar",
  NO_PLAN: "Pa plan aktiv",
  BUSINESS_ACTIVE: "maroBiz aktiv",
  BUSINESS_EXPIRED: "maroBiz ka skaduar",
  BUSINESS_SUSPENDED: "maroBiz i pezulluar",
};

export function BillingSection({ commerce }: { commerce: CommerceEntitlementsState }) {
  const purchasesEnabled=useRaiAcceptAvailability();
  const { user, credits, getAccessToken } = useMaro();
  const userId = user?.id;
  const { data, loading, error } = commerce;
  const [usageState, setUsageState] = React.useState<{ userId: string; data?: CreditUsage; error?: boolean } | null>(null);
  const currentUsage = usageState?.userId === userId ? usageState : null;
  const usage = currentUsage?.data;
  const usageError = currentUsage?.error;
  const [usageRetry, setUsageRetry] = React.useState(0);

  React.useEffect(() => {
    setUsageState(null);
    if (!userId) return;
    let cancelled = false;
    const controller = new AbortController();
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) throw new Error("unauthorized");
        const response = await fetch("/api/credits/usage", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("credit_usage_unavailable");
        const result = await response.json() as CreditUsage;
        if (!cancelled) setUsageState({ userId, data: result });
      } catch { if (!cancelled) setUsageState({ userId, error: true }); }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [userId, getAccessToken, credits, usageRetry]);

  if (loading) {
    return <p className="text-[14px] text-ink-3">Duke ngarkuar…</p>;
  }
  if (error || !data) {
    return <p role="alert" className="text-[14px] text-ink-2">Plani nuk u ngarkua. Rifresko faqen për ta provuar sërish.</p>;
  }

  const ent = data?.entitlements;
  const expiresLabel = ent?.expires_at
    ? new Date(ent.expires_at).toLocaleDateString("sq-AL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-8">
      <section className="rounded-maro16 bg-surface p-6">
        <h2 className="text-[18px] font-semibold tracking-brand text-ink">Plani aktual</h2>
        {ent?.plan_id ? (
          <>
            <p className="mt-3 text-[22px] font-bold tracking-brand text-ink">
              {ent.plan_display_name ?? ent.plan_id}
            </p>
            {expiresLabel && (
              <p className="mt-1 text-[14px] text-ink-2">Aktiv deri më {expiresLabel}</p>
            )}
            <p className="mt-1 text-[14px] text-ink-3">
              Rinovimi automatik: {ent.renewal_mode === "automatic" ? "Po" : "Jo"}
            </p>
            <Badge
              tone="neutral"
              className={cn("mt-3", ent.plan_status === "EXPIRED" && "text-danger")}
            >
              {STATUS_LABELS[ent.plan_status] ?? ent.plan_status}
            </Badge>

          </>
        ) : (
          <>
            <p className="mt-3 text-[15px] text-ink-2">Nuk ke plan aktiv.</p>

          </>
        )}
      </section>

      <section className="rounded-maro16 bg-surface p-6">
        <h2 className="text-[18px] font-semibold tracking-brand text-ink">Kreditet</h2>
        <p className="mt-3 text-[32px] font-bold tracking-brand text-ink">
          {credits} credits
        </p>
        <p className="mt-1 text-[14px] text-ink-3">Kreditet nuk skadojnë.</p>
        {purchasesEnabled?<div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold underline">
          {ent?.can_top_up?<Link href="/pricing?tab=topup">Bli kredite</Link>:<Link href="/pricing">Zgjedh planin</Link>}
          {ent?.renewal_available&&ent.renewal_mode!=="automatic"&&<Link href="/checkout?item=renew&provider=raiaccept">Rinovo planin</Link>}
          {data?.upgradeQuote?.eligible&&ent?.renewal_mode!=="automatic"&&<Link href="/checkout?item=upgrade-pro&provider=raiaccept">Kalo në maroPro</Link>}
        </div>:<p className="mt-4 text-[14px] text-ink-2">Blerjet e reja janë të mbyllura.</p>}
      </section>

      <section className="rounded-maro16 bg-surface p-6" aria-busy={!usage && !usageError}>
        <h2 className="text-[18px] font-semibold tracking-brand text-ink">Përdorimi</h2>
        <p className="mt-1 text-[12px] text-ink-3">Gjithë historiku · pas rimbursimeve</p>
        {usageError ? <p role="alert" className="mt-4 text-[14px] text-ink-2">Përdorimi nuk u ngarkua. <button type="button" className="min-h-11 font-semibold underline" onClick={() => setUsageRetry(value => value + 1)}>Provo sërish</button></p>
          : !usage ? <p className="mt-4 text-[14px] text-ink-3">Duke ngarkuar përdorimin…</p>
          : !usage.items.length ? <p className="mt-4 text-[14px] text-ink-3">Ende nuk ke shpenzime kreditesh.</p> : (
          <ul className="mt-4 space-y-2">
            {usage.items.map((row) => (
              <li key={row.module} className="flex justify-between text-[14px] text-ink-2">
                <span>{row.label}</span>
                <span className="font-semibold text-ink">{row.credits} kredite</span>
              </li>
            ))}
          </ul>
        )}
        {!!usage?.unattributedRefunds && <p className="mt-3 text-[12px] text-ink-3">Rimbursime pa tool të lidhur: {usage.unattributedRefunds} kredite.</p>}
      </section>

      {ent?.expires_at && (
        <p className="text-[12px] text-ink-3">
          Përditësuar: {formatOrderDate(new Date().toISOString())}
        </p>
      )}
    </div>
  );
}
