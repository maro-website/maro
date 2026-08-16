"use client";

import * as React from "react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";

interface FlagRow {
  key: string;
  enabled: boolean;
  metadata?: Record<string, unknown>;
}

interface GuardRow {
  id: string;
  scope: string;
  scopeKey: string | null;
  dailyLimitUsd: number | null;
  enabled: boolean;
  action: string;
  description: string;
}

interface GuardEval {
  guard: { id: string; scope: string; scopeKey: string | null };
  period: string;
  spendUsd: number;
  limitUsd: number;
  pct: number;
  action: string;
  estimated: boolean;
}

export default function OperationsFlagsPage() {
  const [flags, setFlags] = React.useState<FlagRow[]>([]);
  const [guards, setGuards] = React.useState<GuardRow[]>([]);
  const [evaluations, setEvaluations] = React.useState<GuardEval[]>([]);
  const [retentionRuns, setRetentionRuns] = React.useState<Array<{ domain: string; status: string; rowsAffected: number; startedAt: string }>>([]);
  const [busy, setBusy] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const headers = await adminAuthHeaders();
    const [flagsRes, retentionRes] = await Promise.all([
      fetch("/api/admin/operations/logs?kind=flags", { headers }),
      fetch("/api/admin/operations/retention", { headers }),
    ]);
    const flagsData = (await flagsRes.json()) as { flags?: FlagRow[]; budgetGuards?: Array<Record<string, unknown>> };
    const retData = (await retentionRes.json()) as {
      runs?: Array<Record<string, unknown>>;
      evaluations?: GuardEval[];
    };
    setFlags(flagsData.flags ?? []);
    setGuards(
      (flagsData.budgetGuards ?? []).map((g) => ({
        id: g.id as string,
        scope: g.scope as string,
        scopeKey: (g.scope_key as string) ?? null,
        dailyLimitUsd: g.daily_limit_usd != null ? Number(g.daily_limit_usd) : null,
        enabled: Boolean(g.enabled),
        action: ((g.metadata as Record<string, unknown>)?.action as string) ?? "warn",
        description: ((g.metadata as Record<string, unknown>)?.description as string) ?? "",
      }))
    );
    setEvaluations(retData.evaluations ?? []);
    setRetentionRuns(
      (retData.runs ?? []).map((r) => ({
        domain: r.domain as string,
        status: r.status as string,
        rowsAffected: (r.rows_affected as number) ?? 0,
        startedAt: r.started_at as string,
      }))
    );
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function toggleFlag(key: string, enabled: boolean) {
    setBusy(key);
    try {
      const headers = await adminAuthHeaders(true);
      const res = await fetch("/api/admin/operations/flags", {
        method: "POST",
        headers,
        body: JSON.stringify({ key, enabled }),
      });
      if (res.ok) await load();
    } finally {
      setBusy(null);
    }
  }

  async function toggleGuard(id: string, enabled: boolean) {
    setBusy(id);
    try {
      const headers = await adminAuthHeaders(true);
      await fetch("/api/admin/operations/flags", {
        method: "POST",
        headers,
        body: JSON.stringify({ guardId: id, enabledGuard: enabled }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function runRetention() {
    setBusy("retention");
    try {
      const headers = await adminAuthHeaders(true);
      await fetch("/api/admin/operations/retention", { method: "POST", headers, body: JSON.stringify({ action: "run_retention" }) });
      await load();
    } finally {
      setBusy(null);
    }
  }

  const frozen = new Set(["prompt_compiler_v2", "raiffeisen_live", "preset_reveal_enabled"]);

  return (
    <div>
      <AdminPageHeader
        title="Kill switches & guards"
        description="Feature flags, budget guards (estimated USD), and retention status"
        actions={
          <Link href="/admin/operations/audit" className="text-[13px] font-semibold text-brand hover:underline">
            Audit log →
          </Link>
        }
      />

      <section className="mb-6">
        <h2 className="mb-2 text-[14px] font-semibold text-ink">Feature flags</h2>
        <div className="space-y-2">
          {flags.map((f) => {
            const isFrozen = frozen.has(f.key);
            const desc = typeof f.metadata?.description === "string" ? f.metadata.description : "";
            return (
              <div key={f.key} className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3">
                <div>
                  <div className="font-semibold text-ink">{f.key}</div>
                  {desc ? <div className="text-[12px] text-ink-3">{desc}</div> : null}
                  {isFrozen ? <div className="mt-1 text-[11px] font-semibold text-danger">Production frozen</div> : null}
                </div>
                <Switch checked={f.enabled} disabled={busy === f.key || (isFrozen && !f.enabled)} onChange={(on) => void toggleFlag(f.key, on)} />
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-[14px] font-semibold text-ink">Budget guards (estimated)</h2>
        <div className="space-y-2">
          {guards.map((g) => (
            <div key={g.id} className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3">
              <div>
                <div className="font-semibold text-ink">
                  {g.scope}
                  {g.scopeKey ? ` · ${g.scopeKey}` : ""}
                </div>
                <div className="text-[12px] text-ink-3">
                  Action: {g.action} · Daily limit ${g.dailyLimitUsd ?? "—"} · {g.description}
                </div>
              </div>
              <Switch checked={g.enabled} disabled={busy === g.id} onChange={(on) => void toggleGuard(g.id, on)} />
            </div>
          ))}
          {guards.length === 0 && <div className="text-[13px] text-ink-3">No budget guards configured.</div>}
        </div>
        {evaluations.length > 0 && (
          <div className="mt-3 rounded-xl bg-surface-2 p-3 text-[12px] text-ink-2">
            Active threshold states: {evaluations.map((e) => `${e.guard.scope}/${e.period} ${e.pct}% (${e.action})`).join("; ")}
          </div>
        )}
      </section>

      <section className="mb-6 rounded-xl border border-line bg-surface p-4">
        <h2 className="text-[14px] font-semibold text-ink">Data retention</h2>
        <p className="mt-1 text-[12px] text-ink-3">generation_debug policy — purges debug metadata only; never payments or audit.</p>
        <Button className="mt-2" size="sm" loading={busy === "retention"} onClick={() => void runRetention()}>
          Run retention now
        </Button>
        <ul className="mt-3 space-y-1 text-[12px] text-ink-2">
          {retentionRuns.slice(0, 5).map((r, i) => (
            <li key={i}>
              {r.domain} · {r.status} · {r.rowsAffected} rows · {new Date(r.startedAt).toLocaleString()}
            </li>
          ))}
          {retentionRuns.length === 0 && <li>No retention runs recorded yet.</li>}
        </ul>
      </section>

      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="text-[14px] font-semibold text-ink">MFA enforcement</h2>
        <p className="mt-1 text-[12px] text-ink-3">
          Super Admin, Administrator, and Developer roles require Supabase TOTP enrollment and AAL2 before Control Center access.
        </p>
        <Link href="/admin/mfa" className="mt-2 inline-block text-[12px] font-semibold text-brand hover:underline">
          MFA enrollment / challenge →
        </Link>
      </section>
    </div>
  );
}
