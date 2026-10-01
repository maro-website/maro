"use client";

import * as React from "react";
import Link from "next/link";
import { ADMIN_ROUTES } from "@/lib/admin/routes";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";

interface TopupRow {
  id: string;
  credits: number;
  price_cents: number;
  enabled: boolean;
  sort_order: number;
  requires_active_plan: boolean;
}

export default function CommerceTopupsPage() {
  const [topups, setTopups] = React.useState<TopupRow[]>([]);
  const [busy, setBusy] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const headers = await adminAuthHeaders();
    const res = await fetch("/api/admin/commerce/plans", { headers });
    const data = (await res.json()) as { topups?: TopupRow[] };
    setTopups(data.topups ?? []);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  function update(id: string, patch: Partial<TopupRow>) {
    setTopups((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  async function save(row: TopupRow) {
    setBusy(row.id);
    try {
      const headers = await adminAuthHeaders(true);
      await fetch("/api/admin/commerce/plans", {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          kind: "topup",
          id: row.id,
          patch: {
            credits: row.credits,
            price_cents: row.price_cents,
            enabled: row.enabled,
            sort_order: row.sort_order,
            requires_active_plan: row.requires_active_plan,
          },
        }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Top-ups"
        description="Canonical top-up bundles from commerce_topups"
        actions={
          <Link href={ADMIN_ROUTES.commerce.plans} className="text-[13px] font-semibold text-brand hover:underline">
            Plans →
          </Link>
        }
      />

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead className="bg-surface-2 text-[11px] uppercase text-ink-3">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Credits</th>
              <th className="px-3 py-2">Price (€)</th>
              <th className="px-3 py-2">Sort</th>
              <th className="px-3 py-2">Active plan req.</th>
              <th className="px-3 py-2">Enabled</th>
              <th className="px-3 py-2"> </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface">
            {topups.map((t) => (
              <tr key={t.id}>
                <td className="px-3 py-2 font-mono text-[12px]">{t.id}</td>
                <td className="px-3 py-2">
                  <Input type="number" value={t.credits} onChange={(e) => update(t.id, { credits: Number(e.target.value) })} />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    value={(t.price_cents / 100).toFixed(2)}
                    onChange={(e) => update(t.id, { price_cents: Math.round(Number(e.target.value) * 100) })}
                  />
                </td>
                <td className="px-3 py-2">
                  <Input type="number" value={t.sort_order} onChange={(e) => update(t.id, { sort_order: Number(e.target.value) })} />
                </td>
                <td className="px-3 py-2">
                  <Switch checked={t.requires_active_plan} onChange={(v) => update(t.id, { requires_active_plan: v })} />
                </td>
                <td className="px-3 py-2">
                  <Switch checked={t.enabled} onChange={(v) => update(t.id, { enabled: v })} />
                </td>
                <td className="px-3 py-2">
                  <Button size="sm" disabled={busy === t.id} onClick={() => void save(t)}>
                    Save
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
