"use client";

import * as React from "react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";
import { PLAN_PACKAGES, TOPUP_TIERS } from "@/lib/credits/money";

export default function CommercePlansPage() {
  const [generationPricing, setGenerationPricing] = React.useState<Record<string, unknown> | null>(null);

  React.useEffect(() => {
    void (async () => {
      const headers = await adminAuthHeaders();
      const res = await fetch("/api/admin/commerce/plans", { headers });
      const data = (await res.json()) as { generationPricing?: Record<string, unknown> };
      setGenerationPricing(data.generationPricing ?? null);
    })();
  }, []);

  return (
    <div>
      <AdminPageHeader
        title="Plans & Credits"
        description="Purchase packages (EUR, code-defined) and generation credit costs (app_settings)"
        actions={
          <Link href="/admin/commerce/payments" className="text-[13px] font-semibold text-brand hover:underline">
            Payments →
          </Link>
        }
      />

      <section className="mb-6 rounded-xl border border-line bg-surface p-4">
        <h2 className="text-[14px] font-semibold text-ink">Purchase plans (EUR)</h2>
        <p className="mt-1 text-[12px] text-ink-3">Source: src/lib/credits/money.ts — not editable via CMS yet.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {PLAN_PACKAGES.map((p) => (
            <div key={p.id} className="rounded-lg bg-surface-2 p-3">
              <div className="font-semibold text-ink">{p.name}</div>
              <div className="text-[12px] text-ink-3">
                {p.contactOnly ? "Contact sales" : `${p.credits} credits · €${p.priceEur}`}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-[12px] font-semibold text-ink-2">Top-ups</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {TOPUP_TIERS.map((t) => (
            <span key={t.id} className="rounded-lg bg-surface-2 px-2 py-1 text-[11px]">
              {t.credits} cr · €{t.priceEur}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="text-[14px] font-semibold text-ink">Generation pricing (credits)</h2>
        <p className="mt-1 text-[12px] text-ink-3">
          Edit via legacy tab or migrate editor here. Current snapshot loaded from app_settings.
        </p>
        <pre className="mt-3 max-h-[320px] overflow-auto rounded-lg bg-surface-2 p-3 text-[10px] text-ink-2">
          {generationPricing ? JSON.stringify(generationPricing, null, 2) : "Loading…"}
        </pre>
        <Link href="/admin?tab=pricing" className="mt-3 inline-block text-[12px] font-semibold text-brand hover:underline">
          Open legacy pricing editor →
        </Link>
      </section>
    </div>
  );
}
