"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function PayRedirectUnavailableClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order") ?? "";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-5 text-center">
      <div className="w-full max-w-md rounded-maro16 bg-surface p-10">
        <h1 className="text-[20px] font-semibold text-ink">Pagesa nuk është e disponueshme</h1>
        <p className="mt-2 text-[14px] text-ink-2">
          Integrimi me bankën partner është ende në përgatitje. Porosia juaj mbetet e papaguar.
        </p>
        {orderId ? (
          <Link
            href={`/order/cancel?order=${orderId}`}
            className="mt-8 inline-block text-[13px] font-medium text-ink-2 hover:text-ink"
          >
            Kthehu te porosia
          </Link>
        ) : (
          <Link
            href="/pricing"
            className="mt-8 inline-block text-[13px] font-medium text-ink-2 hover:text-ink"
          >
            Shiko planet
          </Link>
        )}
      </div>
    </div>
  );
}
