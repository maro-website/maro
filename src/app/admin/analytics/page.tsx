"use client";

import * as React from "react";
import Link from "next/link";
import { ADMIN_ROUTES } from "@/lib/admin/routes";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";

interface Overview {
  usersTotal: number;
  usersCreators: number;
  generationsTotal: number;
  generationsLast7d: number;
  ordersPaid: number;
  revenueEur: number;
  creditsSpentLast7d: number;
}

export default function AdminAnalyticsPage() {
  const [overview, setOverview] = React.useState<Overview | null>(null);
  const [byTool, setByTool] = React.useState<Array<{ tool: string; count: number; credits: number }>>([]);

  React.useEffect(() => {
    void (async () => {
      const headers = await adminAuthHeaders();
      const [ovRes, toolRes] = await Promise.all([
        fetch("/api/admin/analytics/overview?section=overview", { headers }),
        fetch("/api/admin/analytics/overview?section=tools", { headers }),
      ]);
      const ov = (await ovRes.json()) as { overview?: Overview };
      const tools = (await toolRes.json()) as { byTool?: typeof byTool };
      setOverview(ov.overview ?? null);
      setByTool(tools.byTool ?? []);
    })();
  }, []);

  const cards = overview
    ? [
        { label: "Users", value: overview.usersTotal },
        { label: "Generations (7d)", value: overview.generationsLast7d },
        { label: "Paid orders", value: overview.ordersPaid },
        { label: "Revenue EUR", value: `€${overview.revenueEur.toFixed(2)}` },
        { label: "Credits spent (7d)", value: overview.creditsSpentLast7d },
        { label: "Creators", value: overview.usersCreators },
      ]
    : [];

  return (
    <div>
      <AdminPageHeader
        title="Analytics"
        description="Real aggregates from profiles, generations, and credit_orders"
        actions={
          <Link href={ADMIN_ROUTES.analytics.presets} className="text-[13px] font-semibold text-brand hover:underline">
            Analitika maroPresets →
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-line bg-surface p-4">
            <div className="text-[12px] font-semibold text-ink-3">{c.label}</div>
            <div className="mt-1 text-[24px] font-semibold text-ink">{c.value}</div>
          </div>
        ))}
      </div>

      <section className="mt-6">
        <h2 className="mb-2 text-[14px] font-semibold text-ink">Generations by tool (30d)</h2>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-surface-2 text-[11px] uppercase text-ink-3">
              <tr>
                <th className="px-3 py-2">Tool</th>
                <th className="px-3 py-2">Count</th>
                <th className="px-3 py-2">Credits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {byTool.map((r) => (
                <tr key={r.tool}>
                  <td className="px-3 py-2 font-semibold">{r.tool}</td>
                  <td className="px-3 py-2">{r.count}</td>
                  <td className="px-3 py-2">{r.credits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
