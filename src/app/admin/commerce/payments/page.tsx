"use client";

import * as React from "react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";
import { timeAgo } from "@/lib/utils/format";

interface OrderRow {
  id: string;
  userEmail?: string;
  label: string;
  itemId?: string | null;
  credits: number;
  amountCents: number;
  currency: string;
  status: string;
  promoCode?: string | null;
  displayStatus: string;
  createdAt: string;
}

export default function CommercePaymentsPage() {
  const [orders, setOrders] = React.useState<OrderRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    void (async () => {
      const headers = await adminAuthHeaders();
      const res = await fetch("/api/admin/orders", { headers });
      const data = (await res.json()) as { orders?: OrderRow[] };
      setOrders(data.orders ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <AdminPageHeader
        title="Payments"
        description="Credit orders — Raiffeisen live fulfillment BLOCKED pending documentation"
        actions={
          <Link href="/admin/commerce/ledger" className="text-[13px] font-semibold text-brand hover:underline">
            Credit ledger →
          </Link>
        }
      />

      {loading ? (
        <div className="text-[13px] text-ink-3">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-surface-2 text-[11px] uppercase text-ink-3">
              <tr>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Credits</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Promo</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-3 py-2 text-ink-2">{o.userEmail ?? "—"}</td>
                  <td className="px-3 py-2">{o.label}</td>
                  <td className="px-3 py-2 font-semibold">{o.credits}</td>
                  <td className="px-3 py-2">{(o.amountCents / 100).toFixed(2)} {o.currency}</td>
                  <td className="px-3 py-2 text-ink-3">{o.promoCode ?? "—"}</td>
                  <td className="px-3 py-2">{o.displayStatus ?? o.status}</td>
                  <td className="px-3 py-2 text-ink-3">{timeAgo(o.createdAt)}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-ink-3">
                    No orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
