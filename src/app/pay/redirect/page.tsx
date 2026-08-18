import { Suspense } from "react";
import { isTestPaymentAllowed } from "@/lib/payments/testMode";
import { PayRedirectTestClient } from "./PayRedirectTestClient";
import { PayRedirectUnavailableClient } from "./PayRedirectUnavailableClient";

export default function PayRedirectPage() {
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
