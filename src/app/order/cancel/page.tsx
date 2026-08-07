"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { useMaro } from "@/context/store";
import { XCircle } from "lucide-react";

export default function OrderCancelPage() {
  return (
    <React.Suspense fallback={null}>
      <OrderCancelPageInner />
    </React.Suspense>
  );
}

function OrderCancelPageInner() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order") ?? "";
  const reason = searchParams.get("reason");
  const { getAccessToken } = useMaro();

  React.useEffect(() => {
    if (!orderId) return;
    void (async () => {
      const token = await getAccessToken();
      await fetch("/api/payments/cancel-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          orderId,
          reason: reason === "declined" ? "declined" : "user_cancelled",
        }),
      });
    })();
  }, [orderId, reason, getAccessToken]);

  const isDeclined = reason === "declined";

  return (
    <AppShell showFooter>
      <div className="mx-auto w-full max-w-lg px-5 py-16 text-center sm:px-8">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-surface-2">
          <XCircle className="h-8 w-8 text-ink-3" />
        </div>
        <h1 className="mt-6 text-[clamp(26px,5vw,36px)] font-light tracking-[-0.03em] text-ink">
          {isDeclined ? "Pagesa u refuzua" : "Porosia u anulua"}
        </h1>
        <p className="mt-3 text-[15px] text-ink-2">
          {isDeclined
            ? "Pagesa u refuzua. Provo përsëri."
            : "Porosia u anulua. Nuk u debitua asgjë."}
        </p>

        {orderId && (
          <div className="mt-8 rounded-2xl border border-line bg-surface p-5 text-left">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
              Numri i porosisë
            </p>
            <p className="mt-1 break-all font-mono text-[13px] text-ink">{orderId}</p>
          </div>
        )}

        <Link
          href="/pricing"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-2xl bg-brand px-6 text-[14px] font-semibold text-brand-fg hover:bg-brand-hover"
        >
          Kthehu te planet
        </Link>
      </div>
    </AppShell>
  );
}
