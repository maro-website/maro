import { PurchasesUnavailable } from "@/components/modules/PurchasesUnavailable";
import { Suspense } from "react";
import { AuthGate } from "@/components/dashboard/AuthGate";
import { RaiAcceptCheckout } from "./RaiAcceptCheckout";
export const dynamic="force-dynamic";
export default function CheckoutPage() {
  if (process.env.RAIACCEPT_ENABLED!=="true"||process.env.RAIACCEPT_CHECKOUT_ENABLED!=="true") return <PurchasesUnavailable/>;
  return <AuthGate><Suspense fallback={null}><RaiAcceptCheckout/></Suspense></AuthGate>;
}
