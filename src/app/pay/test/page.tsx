import { notFound } from "next/navigation";
import { legacyPaymentsEnabled } from "@/lib/payments/legacy";
import { Suspense } from "react";
import { isTestPaymentAllowed } from "@/lib/payments/testMode";
import { PayTestPageClient } from "./PayTestPageClient";

export default function PayTestPage() {
  if (!legacyPaymentsEnabled() || !isTestPaymentAllowed()) {
    notFound();
  }

  return (
    <Suspense fallback={null}>
      <PayTestPageClient />
    </Suspense>
  );
}
