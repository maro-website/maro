"use client";

import * as React from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Switch";
import { Spinner } from "@/components/ui/Misc";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/utils/format";
import {
  AlertTriangle,
  Activity,
  Pause,
  Play,
  Coins,
  Users,
} from "lucide-react";

interface SecurityData {
  circuit: {
    aiPaused: boolean;
    hourlySpendUsd: number;
    dailySpendUsd: number;
    queueDepth: number;
    limits: {
      hourlySpendUsd?: number;
      dailySpendUsd?: number;
      pausedModules?: string[];
    };
  };
  activeJobs: Array<{ id: string; module: string; status: string; created_at: string }>;
  abuseEvents: Array<{ id: string; event_type: string; severity: string; created_at: string }>;
  suspiciousIps: Array<{ ip: string; count: number }>;
  marginFlags: Array<{ id: string; module: string; margin_pct: number; credits_charged: number }>;
  refundedTx: Array<{ id: string; user_id: string; amount: number; created_at: string }>;
}

export function SecurityCostsPanel() {
  const [data, setData] = React.useState<SecurityData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    const { data: sess } = await getSupabaseBrowser().auth.getSession();
    const token = sess.session?.access_token;
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/security", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setData((await res.json()) as SecurityData);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const postAction = async (body: Record<string, unknown>) => {
    const { data: sess } = await getSupabaseBrowser().auth.getSession();
    const token = sess.session?.access_token;
    if (!token) return;
    setBusy(true);
    try {
      await fetch("/api/admin/security", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const c = data?.circuit;

  return (
    <div>
      <AdminPageHeader
        title="Siguria & Kostot"
        description="Monitorim shpenzimesh AI, kufizimesh emergjente dhe sinjale abuzimi."
        actions={
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-semibold text-ink-2">AI global</span>
            <Switch
              checked={!c?.aiPaused}
              onChange={(on) => void postAction({ action: on ? "resume_ai" : "pause_ai" })}
              disabled={busy || loading}
            />
            <Badge tone={c?.aiPaused ? "neutral" : "success"}>{c?.aiPaused ? "Pauzuar" : "Aktiv"}</Badge>
          </div>
        }
      />

      {loading || !data ? (
        <div className="grid place-items-center py-20">
          <Spinner />
        </div>
      ) : (
        <div className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={Coins}
              label="Shpenzim / orë"
              value={`$${data.circuit.hourlySpendUsd.toFixed(2)}`}
              sub={`Limit: $${data.circuit.limits.hourlySpendUsd ?? 100}`}
            />
            <StatCard
              icon={Activity}
              label="Shpenzim / ditë"
              value={`$${data.circuit.dailySpendUsd.toFixed(2)}`}
              sub={`Limit: $${data.circuit.limits.dailySpendUsd ?? 500}`}
            />
            <StatCard
              icon={Users}
              label="Radha aktive"
              value={String(data.circuit.queueDepth)}
              sub={`${data.activeJobs.length} job-e aktive`}
            />
          </div>

          <Section title="Module të pauzuara">
            <div className="flex flex-wrap gap-2">
              {["generate", "image", "chat", "audio", "edit"].map((mod) => {
                const paused = data.circuit.limits.pausedModules?.includes(mod);
                return (
                  <Button
                    key={mod}
                    size="sm"
                    variant={paused ? "secondary" : "ghost"}
                    loading={busy}
                    onClick={() =>
                      void postAction({
                        action: paused ? "resume_module" : "pause_module",
                        module: mod,
                      })
                    }
                  >
                    {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                    {mod}
                  </Button>
                );
              })}
            </div>
          </Section>

          <Section title="IP të dyshimta (24h)">
            {data.suspiciousIps.length === 0 ? (
              <p className="text-[13.5px] text-ink-3">Asnjë sinjal i lartë multi-llogari.</p>
            ) : (
              <ul className="space-y-2">
                {data.suspiciousIps.map((s) => (
                  <li
                    key={s.ip}
                    className="flex items-center justify-between rounded-xl bg-surface px-4 py-2.5 text-[13.5px]"
                  >
                    <span className="font-mono text-ink">{s.ip}</span>
                    <Badge tone="brand">{s.count} regjistrime</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Marzhi i ulët (sot)">
            {data.marginFlags.length === 0 ? (
              <p className="text-[13.5px] text-ink-3">Asnjë job pod margin.</p>
            ) : (
              <ul className="space-y-2">
                {data.marginFlags.map((j) => (
                  <li
                    key={j.id}
                    className="flex items-center justify-between rounded-xl bg-surface px-4 py-2.5 text-[13px]"
                  >
                    <span>
                      {j.module} · {j.credits_charged} kr
                    </span>
                    <Badge tone="neutral">{j.margin_pct}% margin</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Abuzim & rimbursime">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Ngjarje</h3>
                <ul className="max-h-48 space-y-1 overflow-y-auto text-[13px]">
                  {data.abuseEvents.slice(0, 15).map((e) => (
                    <li key={e.id} className="flex justify-between gap-2 rounded-lg bg-surface px-3 py-2">
                      <span className="truncate text-ink-2">{e.event_type}</span>
                      <span className="shrink-0 text-ink-3">{timeAgo(e.created_at)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Rimbursime</h3>
                <ul className="max-h-48 space-y-1 overflow-y-auto text-[13px]">
                  {data.refundedTx.length === 0 ? (
                    <li className="text-ink-3">Asnjë rimbursim i fundit.</li>
                  ) : (
                    data.refundedTx.map((t) => (
                      <li key={t.id} className="flex justify-between rounded-lg bg-surface px-3 py-2">
                        <span>{t.amount} kr</span>
                        <span className="text-ink-3">{timeAgo(t.created_at)}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </Section>

          {c && c.hourlySpendUsd >= (c.limits.hourlySpendUsd ?? 100) * 0.8 && (
            <div className="flex items-start gap-3 rounded-2xl border border-warn/40 bg-warn/5 px-4 py-3 text-[13.5px] text-ink-2">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warn" />
              Shpenzimi po i afrohet limitit orar. Kontrollo job-et aktive ose pauzo AI.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
        <Icon className="h-4 w-4 text-brand" /> {label}
      </div>
      <div className="mt-2 text-[24px] font-semibold tracking-tight text-ink">{value}</div>
      <div className="mt-1 text-[12.5px] text-ink-3">{sub}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h2 className="mb-4 text-[15px] font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}
