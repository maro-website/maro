"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMaro } from "@/context/store";
import { paymentMode } from "@/lib/config/features";
import { Loader2 } from "lucide-react";

export function PayTestPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order") ?? "";
  const { getAccessToken, refreshProfile } = useMaro();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!orderId) router.replace("/pricing");
  }, [orderId, router]);

  const pay = async () => {
    setLoading(true);
    setError(null);
    const token = await getAccessToken();
    const res = await fetch("/api/payments/complete-test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ orderId }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Pagesa nuk u përfundua. Provo përsëri ose anulo.");
      return;
    }
    await refreshProfile();
    router.push(`/order/success?order=${orderId}`);
  };

  const simulateDecline = () => {
    router.push(`/order/cancel?order=${orderId}&reason=declined`);
  };

  return (
    <div className="min-h-screen bg-canvas">
      {/* Intentional Raiffeisen test simulation branding */}
      <header className="bg-[#FFCC00] px-5 py-4">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <span className="text-[15px] font-bold tracking-brand text-ink">
            Raiffeisen Bank Kosova
          </span>
          <span className="text-[12px] font-medium text-ink-2">Pagesë e sigurt</span>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-5 py-10">
        <div className="rounded-maro16 bg-surface p-6 sm:p-8 shadow-float">
          <h1 className="text-[18px] font-semibold text-ink">Detajet e pagesës</h1>
          <p className="mt-1 text-[13px] text-ink-2">Porosia #{orderId.slice(0, 8)}…</p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
                Emri në kartë
              </label>
              <input
                readOnly
                value="TEST USER"
                className="mt-1 w-full rounded-maro12 bg-surface-2 px-3 py-2.5 text-[14px] text-ink-2"
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
                Numri i kartës
              </label>
              <input
                readOnly
                value="0000 0000 0000 0000"
                className="mt-1 w-full rounded-maro12 bg-surface-2 px-3 py-2.5 text-[14px] text-ink-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
                  Skadenca
                </label>
                <input
                  readOnly
                  value="00/00"
                  className="mt-1 w-full rounded-maro12 bg-surface-2 px-3 py-2.5 text-[14px] text-ink-2"
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
                  CVV
                </label>
                <input
                  readOnly
                  value="000"
                  className="mt-1 w-full rounded-maro12 bg-surface-2 px-3 py-2.5 text-[14px] text-ink-2"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-4 text-[13px] text-danger">{error}</p>
          )}

          <button
            type="button"
            onClick={() => void pay()}
            disabled={loading}
            className="mt-8 flex h-12 w-full items-center justify-center rounded-maro12 bg-[#FFCC00] text-[15px] font-bold text-ink transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Paguaj tani"}
          </button>

          <Link
            href={`/order/cancel?order=${orderId}`}
            className="mt-4 block text-center text-[13px] font-medium text-ink-3 hover:text-ink"
          >
            Anulo pagesën
          </Link>

          {paymentMode() === "test" && (
            <button
              type="button"
              onClick={simulateDecline}
              className="mt-3 block w-full text-center text-[12px] text-ink-3 hover:text-ink-2"
            >
              Simulo dështim
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
