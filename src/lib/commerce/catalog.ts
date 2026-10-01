import { getPublicCatalog } from "@/lib/payments/orders";

/** Read-only purchase catalog from canonical commerce configuration. */
export async function getPurchaseCatalog() {
  return getPublicCatalog();
}
