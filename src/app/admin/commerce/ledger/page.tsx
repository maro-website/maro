"use client";

import * as React from "react";
import Link from "next/link";
import { ADMIN_ROUTES } from "@/lib/admin/routes";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";
import { timeAgo } from "@/lib/utils/format";

const LEDGER_TYPES = [
  "",
  "plan_purchase",
  "plan_renewal",
  "plan_upgrade",
  "topup",
  "charge",
  "reserve",
  "release",
  "refund",
  "admin_grant",
  "admin_adjustment",
  "manual_adjustment",
] as const;

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
  const [type, setType] = React.useState("");
  const [adjustUserId, setAdjustUserId] = React.useState("");
  const [adjustDelta, setAdjustDelta] = React.useState("");
  const [adjustReason, setAdjustReason] = React.useState("");
  const [adjustMsg, setAdjustMsg] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    const headers = await adminAuthHeaders();
    const params = new URLSearchParams();
    if (userId.trim()) params.set("userId", userId.trim());
    if (type) params.set("type", type);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`/api/admin/commerce/ledger${qs}`, { headers });
    const data = (await res.json()) as { transactions?: LedgerRow[] };
    setRows(data.transactions ?? []);
  }, [userId, type]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function submitAdjust(e: React.FormEvent) {
    e.preventDefault();
    setAdjustMsg(null);
    setBusy(true);
    try {
      const headers = await adminAuthHeaders(true);
      const res = await fetch("/api/admin/credits/adjust", {
        method: "POST",
        headers,
        body: JSON.stringify({
          userId: adjustUserId.trim(),
          mode: "delta",
          delta: Number(adjustDelta),
          reason: adjustReason.trim(),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; balance?: number };
      if (!res.ok) {
        setAdjustMsg(data.error ?? "Adjust failed");
        return;
      }
      setAdjustMsg(`Balance now ${data.balance}`);
      setAdjustDelta("");
      if (adjustUserId.trim()) setUserId(adjustUserId.trim());
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Credit ledger"
        description="credit_transactions — append-only audit trail"
        actions={
          <Link href={ADMIN_ROUTES.commerce.payments} className="text-[13px] font-semibold text-brand hover:underline">
            Orders →
          </Link>
        }
      />

      <form onSubmit={submitAdjust} className="mb-6 rounded-xl border border-line bg-surface p-4">
        <h2 className="text-[14px] font-semibold text-ink">Manual adjustment</h2>
        <p className="mt-1 text-[12px] text-ink-3">Requires reason — uses canonical admin grant/adjustment ledger path.</p>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <Input placeholder="User UUID" value={adjustUserId} onChange={(e) => setAdjustUserId(e.target.value)} />
          <Input type="number" placeholder="Delta (+/-)" value={adjustDelta} onChange={(e) => setAdjustDelta(e.target.value)} />
          <Input placeholder="Reason (min 3 chars)" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} />
          <Button type="submit" disabled={busy}>
            Apply
          </Button>
        </div>
        {adjustMsg && <p className="mt-2 text-[12px] text-ink-2">{adjustMsg}</p>}
      </form>

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="Filter by user UUID"
          className="max-w-xs"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-[13px]"
        >
          {LEDGER_TYPES.map((t) => (
            <option key={t || "all"} value={t}>
              {t || "All types"}
            </option>
          ))}
        </select>
        <Button type="button" variant="secondary" onClick={() => void load()}>
          Refresh
        </Button>
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
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-ink-3">
                  No ledger entries.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
