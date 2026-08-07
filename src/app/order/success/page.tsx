"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { useMaro } from "@/context/store";
import { formatEur } from "@/lib/credits/money";
import { CheckCircle2 } from "lucide-react";

interface OrderDetails {
  id: string;
  label: string;
  priceEur: number;
  credits: number;
  billing?: { fullName?: string; email?: string };
}

export default function OrderSuccessPage() {
  return (
    <React.Suspense fallback={null}>
      <OrderSuccessPageInner />
    </React.Suspense>
  );
}

function OrderSuccessPageInner() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order") ?? "";
  const { credits, user, getAccessToken } = useMaro();
  const [order, setOrder] = React.useState<OrderDetails | null>(null);

  React.useEffect(() => {
    if (!orderId) return;
    void (async () => {
      const token = await getAccessToken();
      const res = await fetch(`/api/payments/order?orderId=${encodeURIComponent(orderId)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data = (await res.json()) as { order: OrderDetails & { billing?: OrderDetails["billing"] } };
      setOrder(data.order);
    })();
  }, [orderId, getAccessToken]);

  return (
    <AppShell showFooter>
      <div className="mx-auto w-full max-w-lg px-5 py-16 text-center sm:px-8">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/10">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <h1 className="mt-6 text-[clamp(26px,5vw,36px)] font-light tracking-[-0.03em] text-ink">
          Pagesa u konfirmua
        </h1>
        <p className="mt-3 text-[15px] text-ink-2">
          Faleminderit{user?.name ? `, ${user.name}` : ""}! Kreditet u shtuan në llogarinë tuaj.
        </p>

        {orderId && (
          <div className="mt-8 rounded-2xl border border-line bg-surface p-5 text-left">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
              Numri i porosisë
            </p>
            <p className="mt-1 break-all font-mono text-[13px] text-ink">{orderId}</p>
            {order && (
              <>
                <p className="mt-4 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
                  Paketa
                </p>
                <p className="mt-1 text-[15px] font-semibold text-ink">
                  {order.label} · {formatEur(order.priceEur)} · {order.credits.toLocaleString("de-DE")}{" "}
                  kredite
                </p>
              </>
            )}
            <p className="mt-3 text-[13px] text-ink-2">
              {order?.billing?.fullName ?? user?.name} · {order?.billing?.email ?? user?.email}
            </p>
          </div>
        )}

        <p className="mt-6 text-[14px] text-ink-2">
          Balanca aktuale:{" "}
          <strong className="text-ink">{credits.toLocaleString("de-DE")} kredite</strong>
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-brand px-6 text-[14px] font-semibold text-brand-fg hover:bg-brand-hover"
          >
            Fillo me maro
          </Link>
          <Link
            href="/account?tab=orders"
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-surface-2 px-6 text-[14px] font-semibold text-ink hover:bg-line"
          >
            Porositë e mia
          </Link>
        </div>

        <p className="mt-8 text-[12px] text-ink-3">
          Pyetje rreth rimbursimit?{" "}
          <Link href="/legal/refund" className="font-semibold text-ink-2 hover:text-ink">
            Politika e rimbursimit
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
