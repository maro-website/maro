import { Suspense } from "react";
import { notFound } from "next/navigation";
import { legacyPaymentsEnabled } from "@/lib/payments/legacy";
import { isTestPaymentAllowed } from "@/lib/payments/testMode";
import { PayRedirectTestClient } from "./PayRedirectTestClient";
import { PayRedirectUnavailableClient } from "./PayRedirectUnavailableClient";

export default function PayRedirectPage() {
  if (!legacyPaymentsEnabled()) notFound();
  if (isTestPaymentAllowed()) {
    return (
      <Suspense fallback={null}>
        <PayRedirectTestClient />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={null}>
      <PayRedirectUnavailableClient />
    </Suspense>
  );
}
