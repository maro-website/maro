"use client";

import * as React from "react";
import Link from "next/link";
import { ADMIN_ROUTES } from "@/lib/admin/routes";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";

interface PlanRow {
  id: string;
  enabled: boolean;
  display_name: string;
  description: string;
  price_cents: number;
  included_credits: number;
  duration_days: number;
  workspace_limit: number;
  concurrency_limit: number;
  renewal_window_days: number;
  recommended_badge: string | null;
  sort_order: number;
  contact_only: boolean;
}

export default function CommercePlansPage() {
  const [plans, setPlans] = React.useState<PlanRow[]>([]);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [generationPricing, setGenerationPricing] = React.useState<Record<string, unknown> | null>(null);

  const load = React.useCallback(async () => {
    const headers = await adminAuthHeaders();
    const res = await fetch("/api/admin/commerce/plans", { headers });
    const data = (await res.json()) as { plans?: PlanRow[]; generationPricing?: Record<string, unknown> };
    setPlans(data.plans ?? []);
    setGenerationPricing(data.generationPricing ?? null);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function savePlan(plan: PlanRow) {
    setBusy(plan.id);
    try {
      const headers = await adminAuthHeaders(true);
      await fetch("/api/admin/commerce/plans", {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          kind: "plan",
          id: plan.id,
          patch: {
            enabled: plan.enabled,
            display_name: plan.display_name,
            description: plan.description,
            price_cents: plan.price_cents,
            included_credits: plan.included_credits,
            duration_days: plan.duration_days,
            workspace_limit: plan.workspace_limit,
            concurrency_limit: plan.concurrency_limit,
            renewal_window_days: plan.renewal_window_days,
            recommended_badge: plan.recommended_badge,
            sort_order: plan.sort_order,
          },
        }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  }

  function updatePlan(id: string, patch: Partial<PlanRow>) {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  return (
    <div>
      <AdminPageHeader
        title="Plans"
        description="Canonical IDs standard · pro · business — configuration only"
        actions={
          <Link href={ADMIN_ROUTES.commerce.overview} className="text-[13px] font-semibold text-brand hover:underline">
            Overview →
          </Link>
        }
      />

      <div className="space-y-6">
        {plans.map((plan) => (
          <section key={plan.id} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-semibold text-ink">
                  {plan.id} {plan.contact_only ? "(contact only)" : ""}
                </h2>
                <p className="text-[12px] text-ink-3">Immutable plan ID</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-ink-3">Enabled</span>
                <Switch
                  checked={plan.enabled}
                  onChange={(v) => updatePlan(plan.id, { enabled: v })}
                  disabled={plan.contact_only}
                />
              </div>
            </div>

            {!plan.contact_only && (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Field label="Display name" value={plan.display_name} onChange={(v) => updatePlan(plan.id, { display_name: v })} />
                <Field label="Price (cents)" type="number" value={String(plan.price_cents)} onChange={(v) => updatePlan(plan.id, { price_cents: Number(v) })} />
                <Field label="Included credits" type="number" value={String(plan.included_credits)} onChange={(v) => updatePlan(plan.id, { included_credits: Number(v) })} />
                <Field label="Duration (days)" type="number" value={String(plan.duration_days)} onChange={(v) => updatePlan(plan.id, { duration_days: Number(v) })} />
                <Field label="Workspace limit" type="number" value={String(plan.workspace_limit)} onChange={(v) => updatePlan(plan.id, { workspace_limit: Number(v) })} />
                <Field label="Concurrency" type="number" value={String(plan.concurrency_limit)} onChange={(v) => updatePlan(plan.id, { concurrency_limit: Number(v) })} />
                <Field label="Renewal window (days)" type="number" value={String(plan.renewal_window_days)} onChange={(v) => updatePlan(plan.id, { renewal_window_days: Number(v) })} />
                <Field label="Sort order" type="number" value={String(plan.sort_order)} onChange={(v) => updatePlan(plan.id, { sort_order: Number(v) })} />
                <Field label="Badge" value={plan.recommended_badge ?? ""} onChange={(v) => updatePlan(plan.id, { recommended_badge: v || null })} />
              </div>
            )}

            <Field
              className="mt-3"
              label="Description"
              value={plan.description}
              onChange={(v) => updatePlan(plan.id, { description: v })}
            />

            <Button className="mt-4" disabled={busy === plan.id} onClick={() => void savePlan(plan)}>
              {busy === plan.id ? "Saving…" : "Save plan"}
            </Button>
          </section>
        ))}
      </div>

      <section className="mt-8 rounded-xl border border-line bg-surface p-4">
        <h2 className="text-[14px] font-semibold text-ink">Generation pricing snapshot</h2>
        <p className="mt-1 text-[12px] text-ink-3">Engine domain — edit via Engine admin / legacy tab.</p>
        <pre className="mt-3 max-h-[240px] overflow-auto rounded-lg bg-surface-2 p-3 text-[10px] text-ink-2">
          {generationPricing ? JSON.stringify(generationPricing, null, 2) : "Loading…"}
        </pre>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-[11px] font-semibold text-ink-3">{label}</label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
