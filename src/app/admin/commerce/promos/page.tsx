"use client";

import * as React from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";

interface PromoRow {
  id: string;
  code: string;
  slug: string | null;
  discountPercent: number;
  active: boolean;
  usageCount?: number;
  paidOrderCount?: number;
}

export default function CommercePromosPage() {
  const [promos, setPromos] = React.useState<PromoRow[]>([]);
  const [code, setCode] = React.useState("");
  const [discount, setDiscount] = React.useState(10);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    const headers = await adminAuthHeaders();
    const res = await fetch("/api/admin/commerce/promos", { headers });
    const data = (await res.json()) as { promos?: PromoRow[] };
    setPromos(data.promos ?? []);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function createPromo() {
    if (!code.trim()) return;
    setBusy(true);
    try {
      const headers = await adminAuthHeaders(true);
      await fetch("/api/admin/commerce/promos", {
        method: "POST",
        headers,
        body: JSON.stringify({ code, discountPercent: discount, active: true }),
      });
      setCode("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(p: PromoRow) {
    const headers = await adminAuthHeaders(true);
    await fetch("/api/admin/commerce/promos", {
      method: "POST",
      headers,
      body: JSON.stringify({ id: p.id, code: p.code, discountPercent: p.discountPercent, active: !p.active }),
    });
    await load();
  }

  return (
    <div>
      <AdminPageHeader title="Promo codes" description="Audited CRUD — replaces direct Supabase browser writes" />

      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-line bg-surface p-4">
        <div>
          <label className="text-[11px] font-semibold text-ink-3">Code</label>
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="MARO10" />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-ink-3">Discount %</label>
          <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
        </div>
        <Button onClick={() => void createPromo()} disabled={busy || !code.trim()}>
          Add promo
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-surface-2 text-[11px] uppercase text-ink-3">
            <tr>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Discount</th>
              <th className="px-3 py-2">Uses</th>
              <th className="px-3 py-2">Paid orders</th>
              <th className="px-3 py-2">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface">
            {promos.map((p) => (
              <tr key={p.id}>
                <td className="px-3 py-2 font-semibold">{p.code}</td>
                <td className="px-3 py-2">{p.discountPercent}%</td>
                <td className="px-3 py-2">{p.usageCount ?? 0}</td>
                <td className="px-3 py-2">{p.paidOrderCount ?? 0}</td>
                <td className="px-3 py-2">
                  <button type="button" onClick={() => void toggleActive(p)} className="text-brand hover:underline">
                    {p.active ? "Active" : "Inactive"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
