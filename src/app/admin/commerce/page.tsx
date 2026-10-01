"use client";

import * as React from "react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ADMIN_ROUTES } from "@/lib/admin/routes";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";
import { timeAgo } from "@/lib/utils/format";
import { formatCredits } from "@/lib/credits/format";

interface OverviewData {
  memberships: { active: number; renewalWindow: number; expired: number; total: number };
  credits: { granted: number; spent: number };
  recentPlanPurchases: { id: string; orderKind: string | null; itemId: string | null; credits: number; amountCents: number; paidAt: string | null }[];
  recentTopups: { id: string; credits: number; amountCents: number; paidAt: string | null }[];
  pendingOrFailedOrders: { id: string; status: string; created_at: string }[];
}

export default function CommerceOverviewPage() {
  const [data, setData] = React.useState<OverviewData | null>(null);

  React.useEffect(() => {
    void (async () => {
      const headers = await adminAuthHeaders();
      const res = await fetch("/api/admin/commerce/overview", { headers });
      if (res.ok) setData((await res.json()) as OverviewData);
    })();
  }, []);

  return (
    <div>
      <AdminPageHeader
        title="Commerce Overview"
        description="Real membership, credit, and order metrics — no live payment revenue"
      />

      {!data ? (
        <p className="text-[13px] text-ink-3">Loading…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Active memberships", value: data.memberships.active, creditCount: false },
              { label: "Renewal window", value: data.memberships.renewalWindow, creditCount: false },
              { label: "Expired", value: data.memberships.expired, creditCount: false },
              { label: "Credits granted", value: data.credits.granted, creditCount: true },
              { label: "Credits spent", value: data.credits.spent, creditCount: true },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl border border-line bg-surface p-4">
                <p className="text-[11px] font-semibold uppercase text-ink-3">{kpi.label}</p>
                <p className="mt-2 text-[28px] font-light text-ink">{kpi.creditCount ? formatCredits(kpi.value) : kpi.value.toLocaleString("de-DE")}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-line bg-surface p-4">
              <h2 className="text-[14px] font-semibold text-ink">Recent plan purchases</h2>
              <ul className="mt-3 space-y-2 text-[13px]">
                {data.recentPlanPurchases.map((o) => (
                  <li key={o.id} className="flex justify-between gap-2 text-ink-2">
                    <span>
                      {o.orderKind} · {o.itemId} · {formatCredits(o.credits)} cr
                    </span>
                    <span className="shrink-0 text-ink-3">
                      €{(o.amountCents / 100).toFixed(2)} · {o.paidAt ? timeAgo(o.paidAt) : "—"}
                    </span>
                  </li>
                ))}
                {data.recentPlanPurchases.length === 0 && (
                  <li className="text-ink-3">No paid plan orders yet.</li>
                )}
              </ul>
            </section>

            <section className="rounded-xl border border-line bg-surface p-4">
              <h2 className="text-[14px] font-semibold text-ink">Recent top-ups</h2>
              <ul className="mt-3 space-y-2 text-[13px]">
                {data.recentTopups.map((o) => (
                  <li key={o.id} className="flex justify-between gap-2 text-ink-2">
                    <span>{formatCredits(o.credits)} credits</span>
                    <span className="text-ink-3">
                      €{(o.amountCents / 100).toFixed(2)} · {o.paidAt ? timeAgo(o.paidAt) : "—"}
                    </span>
                  </li>
                ))}
                {data.recentTopups.length === 0 && <li className="text-ink-3">No top-ups yet.</li>}
              </ul>
            </section>
          </div>

          {data.pendingOrFailedOrders.length > 0 && (
            <section className="mt-6 rounded-xl border border-line bg-surface p-4">
              <h2 className="text-[14px] font-semibold text-ink">Pending / cancelled orders</h2>
              <ul className="mt-3 space-y-2 text-[13px] text-ink-2">
                {data.pendingOrFailedOrders.map((o) => (
                  <li key={o.id}>
                    {o.id.slice(0, 8)}… · {o.status} · {timeAgo(o.created_at)}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-8 flex flex-wrap gap-3 text-[13px] font-semibold">
            <Link href={ADMIN_ROUTES.commerce.plans} className="text-brand hover:underline">
              Plans →
            </Link>
            <Link href={ADMIN_ROUTES.commerce.topups} className="text-brand hover:underline">
              Top-ups →
            </Link>
            <Link href={ADMIN_ROUTES.commerce.business} className="text-brand hover:underline">
              Business →
            </Link>
            <Link href={ADMIN_ROUTES.commerce.payments} className="text-brand hover:underline">
              Orders →
            </Link>
            <Link href={ADMIN_ROUTES.commerce.ledger} className="text-brand hover:underline">
              Ledger →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
