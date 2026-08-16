"use client";

import * as React from "react";
import { getAccessToken } from "@/lib/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

interface Kpis {
  revenueToday: number | null;
  revenueTodayAvailable: boolean;
  aiCostToday: number | null;
  aiCostTodayAvailable: boolean;
  grossMargin: number | null;
  grossMarginAvailable: boolean;
  generationsToday: number;
  activeUsersToday: number;
  generationSuccessRate: number | null;
  generationSuccessRateAvailable: boolean;
  attentionRequired: number;
  updatedAt: string;
}

function fmt(v: number | null, available: boolean, suffix = ""): string {
  if (!available || v == null) return "—";
  return `${v.toLocaleString()}${suffix}`;
}

export function CommandCenterDashboard() {
  const [kpis, setKpis] = React.useState<Kpis | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch("/api/admin/command-center/kpis", { headers });
    const data = (await res.json()) as { kpis?: Kpis };
    setKpis(data.kpis ?? null);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 60_000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div>
      <AdminPageHeader
        title="Command Center"
        description="Operational snapshot — real data only; unavailable metrics show as —"
      />

      {loading ? (
        <div className="text-[13px] text-ink-3">Duke ngarkuar…</div>
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard label="Revenue Today" value={fmt(kpis?.revenueToday ?? null, kpis?.revenueTodayAvailable ?? false, " ALL")} />
            <KpiCard label="AI Cost Today" value={fmt(kpis?.aiCostToday ?? null, kpis?.aiCostTodayAvailable ?? false, " USD")} />
            <KpiCard
              label="Gross Margin"
              value={kpis?.grossMarginAvailable ? `${kpis?.grossMargin}%` : "—"}
            />
            <KpiCard label="Generations Today" value={String(kpis?.generationsToday ?? 0)} />
            <KpiCard label="Active Users Today" value={String(kpis?.activeUsersToday ?? 0)} />
            <KpiCard
              label="Generation Success Rate"
              value={kpis?.generationSuccessRateAvailable ? `${kpis?.generationSuccessRate}%` : "—"}
            />
          </div>

          <div className="rounded-xl border border-line bg-surface p-4">
            <div className="text-[12px] font-semibold text-ink">Attention required</div>
            <div className="mt-1 text-[24px] font-semibold text-ink">{kpis?.attentionRequired ?? 0}</div>
            <div className="mt-1 text-[11px] text-ink-3">Open generation reports + shadow compile failures (today)</div>
          </div>

          <div className="mt-3 text-[11px] text-ink-3">
            Production freeze: Engine LIVE blocked · maroWeb shadow only · prompt_compiler_v2=false
            {kpis?.updatedAt ? ` · Updated ${kpis.updatedAt.slice(11, 19)}` : null}
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">{label}</div>
      <div className="mt-1 text-[22px] font-semibold text-ink">{value}</div>
    </div>
  );
}
