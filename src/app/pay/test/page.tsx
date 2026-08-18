import { notFound } from "next/navigation";
import { Suspense } from "react";
import { isTestPaymentAllowed } from "@/lib/payments/testMode";
import { PayTestPageClient } from "./PayTestPageClient";

export default function PayTestPage() {
  if (!isTestPaymentAllowed()) {
    notFound();
  }

  return (
    <Suspense fallback={null}>
      <PayTestPageClient />
    </Suspense>
  );
}
