"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { paymentMode } from "@/lib/config/features";
import { Loader2 } from "lucide-react";

export default function PayRedirectPage() {
  return (
    <React.Suspense fallback={null}>
      <PayRedirectPageInner />
    </React.Suspense>
  );
}

function PayRedirectPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order") ?? "";

  React.useEffect(() => {
    if (!orderId) {
      router.replace("/pricing");
      return;
    }
    const t = setTimeout(() => {
      router.replace(`/pay/test?order=${orderId}`);
    }, 2000);
    return () => clearTimeout(t);
  }, [orderId, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-5 text-center">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-neutral-50 p-10">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#FFCC00]">
          <Loader2 className="h-7 w-7 animate-spin text-neutral-900" />
        </div>
        <h1 className="mt-2 text-[20px] font-semibold text-neutral-900">
          {paymentMode() === "test" ? "Ridrejtim te pagesa e testit…" : "Ridrejtim te pagesa…"}
        </h1>
        <p className="mt-2 text-[14px] text-neutral-600">
          {paymentMode() === "test"
            ? "Po vazhdoni me modalitetin e testit të porosisë — pagesa live me bankë është ende e çaktivizuar."
            : "Po ju ridrejtojmë te pagesa e sigurt e bankës partner."}
        </p>
        {orderId && (
          <Link
            href={`/order/cancel?order=${orderId}`}
            className="mt-8 inline-block text-[13px] font-medium text-neutral-500 hover:text-neutral-800"
          >
            Anulo
          </Link>
        )}
      </div>
    </div>
  );
}
