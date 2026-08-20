"use client";

import * as React from "react";
import Link from "next/link";
import { ADMIN_ROUTES } from "@/lib/admin/routes";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";
import { timeAgo } from "@/lib/utils/format";

interface OrderRow {
  id: string;
  userEmail?: string;
  label: string;
  itemId?: string | null;
  orderKind?: string | null;
  credits: number;
  amountCents: number;
  currency: string;
  status: string;
  promoCode?: string | null;
  displayStatus: string;
  commercialSnapshot?: Record<string, unknown> | null;
  providerTransactionId?: string | null;
  createdAt: string;
  paidAt?: string | null;
}

export default function CommercePaymentsPage() {
  const [orders, setOrders] = React.useState<OrderRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [expanded, setExpanded] = React.useState<string | null>(null);

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
        title="Orders"
        description="Credit orders with commercial snapshot — Raiffeisen live fulfillment on hold"
        actions={
          <Link href={ADMIN_ROUTES.commerce.ledger} className="text-[13px] font-semibold text-brand hover:underline">
            Credit ledger →
          </Link>
        }
      />

      {loading ? (
        <div className="text-[13px] text-ink-3">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[960px] text-left text-[13px]">
            <thead className="bg-surface-2 text-[11px] uppercase text-ink-3">
              <tr>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Kind</th>
                <th className="px-3 py-2">Plan / top-up</th>
                <th className="px-3 py-2">Credits</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Provider tx</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Fulfilled</th>
                <th className="px-3 py-2"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {orders.map((o) => (
                <React.Fragment key={o.id}>
                  <tr>
                    <td className="px-3 py-2 text-ink-2">{o.userEmail ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-[11px]">{o.orderKind ?? "—"}</td>
                    <td className="px-3 py-2">{o.label}</td>
                    <td className="px-3 py-2 font-semibold">{o.credits}</td>
                    <td className="px-3 py-2">
                      {(o.amountCents / 100).toFixed(2)} {o.currency}
                    </td>
                    <td className="px-3 py-2">{o.displayStatus ?? o.status}</td>
                    <td className="px-3 py-2 font-mono text-[10px] text-ink-3">
                      {o.providerTransactionId ? o.providerTransactionId.slice(0, 16) + "…" : "—"}
                    </td>
                    <td className="px-3 py-2 text-ink-3">{timeAgo(o.createdAt)}</td>
                    <td className="px-3 py-2 text-ink-3">{o.paidAt ? timeAgo(o.paidAt) : "—"}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="text-brand hover:underline"
                        onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                      >
                        {expanded === o.id ? "Hide" : "Snapshot"}
                      </button>
                    </td>
                  </tr>
                  {expanded === o.id && o.commercialSnapshot && (
                    <tr>
                      <td colSpan={10} className="bg-surface-2 px-3 py-2">
                        <pre className="max-h-[160px] overflow-auto text-[10px] text-ink-2">
                          {JSON.stringify(o.commercialSnapshot, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-ink-3">
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
