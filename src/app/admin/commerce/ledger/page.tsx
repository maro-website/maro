"use client";

import * as React from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";
import { timeAgo } from "@/lib/utils/format";

interface LedgerRow {
  id: string;
  userId: string;
  type: string;
  amount: number;
  balanceAfter: number;
  createdAt: string;
}

export default function CommerceLedgerPage() {
  const [rows, setRows] = React.useState<LedgerRow[]>([]);
  const [userId, setUserId] = React.useState("");

  const load = React.useCallback(async () => {
    const headers = await adminAuthHeaders();
    const qs = userId.trim() ? `?userId=${encodeURIComponent(userId.trim())}` : "";
    const res = await fetch(`/api/admin/commerce/ledger${qs}`, { headers });
    const data = (await res.json()) as { transactions?: LedgerRow[] };
    setRows(data.transactions ?? []);
  }, [userId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <AdminPageHeader title="Credit ledger" description="credit_transactions — append-only audit trail" />

      <div className="mb-4 flex gap-2">
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="Filter by user UUID"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-[13px]"
        />
        <button type="button" onClick={() => void load()} className="rounded-lg bg-surface-2 px-3 py-2 text-[13px] font-semibold">
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-surface-2 text-[11px] uppercase text-ink-3">
            <tr>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Balance after</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 font-semibold">{r.type}</td>
                <td className={`px-3 py-2 ${r.amount >= 0 ? "text-ink" : "text-danger"}`}>
                  {r.amount >= 0 ? "+" : ""}
                  {r.amount}
                </td>
                <td className="px-3 py-2">{r.balanceAfter}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-ink-3">{r.userId.slice(0, 8)}…</td>
                <td className="px-3 py-2 text-ink-3">{timeAgo(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
