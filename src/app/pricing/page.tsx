import PricingClient from "./PricingClient";
import { getPurchaseCatalog } from "@/lib/commerce/catalog";
import { raiAcceptCheckoutEnabled } from "@/lib/payments/raiaccept/config";
export const dynamic = "force-dynamic";
export default async function PricingPage() {
  let catalog = null;
  try { catalog = await getPurchaseCatalog(); } catch { /* Client retry keeps the page usable during a temporary catalog outage. */ }
  return <PricingClient initialCatalog={catalog} initialEnabled={raiAcceptCheckoutEnabled()} />;
}
