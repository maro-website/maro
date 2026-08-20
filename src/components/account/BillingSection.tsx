"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useMaro } from "@/context/store";
import { formatEur } from "@/lib/credits/money";
import { formatOrderDate } from "@/lib/payments/orderDisplay";
import { cn } from "@/lib/utils/cn";

interface EntitlementsPayload {
  entitlements: {
    plan_id: string | null;
    plan_status: string;
    plan_display_name: string | null;
    expires_at: string | null;
    renewal_mode: string;
    renewal_available: boolean;
    credits_balance: number;
    can_top_up: boolean;
    workspace_limit: number;
    concurrency_limit: number;
  };
  upgradeQuote?: { eligible: boolean; price_cents: number; credits: number };
}

interface UsageRow {
  module: string;
  credits: number;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Plan aktiv",
  RENEWAL_WINDOW: "Rinovimi i disponueshëm",
  EXPIRED: "Plani ka skaduar",
  NO_PLAN: "Pa plan aktiv",
  BUSINESS_ACTIVE: "maroBiz aktiv",
  BUSINESS_EXPIRED: "maroBiz ka skaduar",
  BUSINESS_SUSPENDED: "maroBiz i pezulluar",
};

export function BillingSection() {
  const router = useRouter();
  const { user, credits } = useMaro();
  const [data, setData] = React.useState<EntitlementsPayload | null>(null);
  const [usage, setUsage] = React.useState<UsageRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [entRes, txRes] = await Promise.all([
          fetch("/api/commerce/entitlements"),
          fetch("/api/credits/transactions?limit=100"),
        ]);
        if (!cancelled && entRes.ok) {
          setData((await entRes.json()) as EntitlementsPayload);
        }
        if (!cancelled && txRes.ok) {
          const tx = (await txRes.json()) as {
            transactions?: { type: string; amount: number; metadata?: { module?: string } }[];
          };
          const byModule = new Map<string, number>();
          for (const t of tx.transactions ?? []) {
            if (t.type !== "charge") continue;
            const mod = t.metadata?.module ?? "other";
            byModule.set(mod, (byModule.get(mod) ?? 0) + t.amount);
          }
          setUsage(
            [...byModule.entries()]
              .map(([module, creditsUsed]) => ({ module, credits: creditsUsed }))
              .sort((a, b) => b.credits - a.credits)
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return <p className="text-[14px] text-ink-3">Duke ngarkuar…</p>;
  }

  const ent = data?.entitlements;
  const expiresLabel = ent?.expires_at
    ? new Date(ent.expires_at).toLocaleDateString("sq-AL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-8">
      <section className="rounded-maro16 bg-surface p-6">
        <h2 className="text-[18px] font-semibold tracking-brand text-ink">Plani aktual</h2>
        {ent?.plan_id ? (
          <>
            <p className="mt-3 text-[22px] font-bold tracking-brand text-ink">
              {ent.plan_display_name ?? ent.plan_id}
            </p>
            {expiresLabel && (
              <p className="mt-1 text-[14px] text-ink-2">Aktiv deri më {expiresLabel}</p>
            )}
            <p className="mt-1 text-[14px] text-ink-3">
              Rinovimi automatik: {ent.renewal_mode === "automatic" ? "Po" : "Jo"}
            </p>
            <Badge
              tone="neutral"
              className={cn("mt-3", ent.plan_status === "EXPIRED" && "text-danger")}
            >
              {STATUS_LABELS[ent.plan_status] ?? ent.plan_status}
            </Badge>
            <div className="mt-5 flex flex-wrap gap-3">
              {ent.renewal_available && (
                <Button onClick={() => router.push("/checkout?item=renew")}>Rinovo planin</Button>
              )}
              {ent.plan_status === "EXPIRED" || ent.plan_status === "NO_PLAN" ? (
                <Button onClick={() => router.push("/pricing")}>Aktivizo planin</Button>
              ) : null}
              {data?.upgradeQuote?.eligible && (
                <Button variant="secondary" onClick={() => router.push("/checkout?item=upgrade-pro")}>
                  Kaloni në maroPro (+{formatEur(data.upgradeQuote.price_cents / 100)})
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 text-[15px] text-ink-2">Nuk ke plan aktiv.</p>
            <Button className="mt-4" onClick={() => router.push("/pricing")}>
              Aktivizo planin
            </Button>
          </>
        )}
      </section>

      <section className="rounded-maro16 bg-surface p-6">
        <h2 className="text-[18px] font-semibold tracking-brand text-ink">Kreditet</h2>
        <p className="mt-3 text-[32px] font-bold tracking-brand text-ink">
          {credits} credits
        </p>
        <p className="mt-1 text-[14px] text-ink-3">Kreditet nuk skadojnë.</p>
        {ent?.can_top_up ? (
          <Button className="mt-4" onClick={() => router.push("/pricing?tab=topup")}>
            Blej Top-up
          </Button>
        ) : (
          <p className="mt-4 text-[14px] text-ink-2">
            Top-up kërkon plan aktiv.{" "}
            <Link href="/pricing" className="font-semibold text-brand hover:underline">
              Shiko planet
            </Link>
          </p>
        )}
      </section>

      {usage.length > 0 && (
        <section className="rounded-maro16 bg-surface p-6">
          <h2 className="text-[18px] font-semibold tracking-brand text-ink">Përdorimi</h2>
          <ul className="mt-4 space-y-2">
            {usage.map((row) => (
              <li key={row.module} className="flex justify-between text-[14px] text-ink-2">
                <span>{row.module}</span>
                <span className="font-semibold text-ink">{row.credits} kredite</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {ent?.expires_at && (
        <p className="text-[12px] text-ink-3">
          Përditësuar: {formatOrderDate(new Date().toISOString())}
        </p>
      )}
    </div>
  );
}
