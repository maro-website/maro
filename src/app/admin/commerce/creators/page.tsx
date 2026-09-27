"use client";

import * as React from "react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";

interface CommissionRow {
  id: string;
  creatorId: string;
  email: string | null;
  promoCode: string | null;
  orderId: string | null;
  grossAmount: number;
  commissionAmount: number;
  status: string;
  paidAt: string | null;
  paymentReference: string | null;
}

export default function CommerceCreatorsPage() {
  const [rows, setRows] = React.useState<CommissionRow[]>([]);
  const [busy, setBusy] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const headers = await adminAuthHeaders();
    const res = await fetch("/api/admin/commerce/commissions", { headers });
    const data = (await res.json()) as { commissions?: CommissionRow[] };
    setRows(data.commissions ?? []);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function markPaid(id: string) {
    const ref = window.prompt("Payment reference (optional):") ?? "";
    if (!window.confirm("Mark this commission as manually paid? No bank transfer is executed.")) return;
    setBusy(id);
    try {
      const headers = await adminAuthHeaders(true);
      await fetch("/api/admin/commerce/commissions", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "mark_paid", commissionId: id, paymentReference: ref }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Creator commissions"
        description="Manual payout workflow — Mark as Paid records actor, timestamp, and reference only"
      />

      <div className="mb-3 rounded-xl border border-line bg-surface-2 px-4 py-3 text-[12px] text-ink-2">
        Payouts are intentionally manual for this release. The system does not execute bank transfers.
      </div>

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-surface-2 text-[11px] uppercase text-ink-3">
            <tr>
              <th className="px-3 py-2">Creator</th>
              <th className="px-3 py-2">Promo</th>
              <th className="px-3 py-2">Gross</th>
              <th className="px-3 py-2">Commission</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2">{r.email ?? r.creatorId.slice(0, 8)}</td>
                <td className="px-3 py-2 font-semibold">{r.promoCode ?? "—"}</td>
                <td className="px-3 py-2">€{r.grossAmount.toFixed(2)}</td>
                <td className="px-3 py-2 font-semibold">€{r.commissionAmount.toFixed(2)}</td>
                <td className="px-3 py-2 capitalize">{r.status}</td>
                <td className="px-3 py-2">
                  {r.status === "pending" && !r.id.startsWith("est-") ? (
                    <Button size="sm" loading={busy === r.id} onClick={() => void markPaid(r.id)}>
                      Mark as Paid
                    </Button>
                  ) : (
                    <span className="text-ink-3">{r.paidAt ? `Paid ${r.paymentReference ?? ""}` : "—"}</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-ink-3">
                  No commission records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
