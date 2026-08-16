import { PLAN_PACKAGES, TOPUP_TIERS, LIST_PRICE_CENTI_CREDIT } from "@/lib/credits/money";

/** Read-only purchase catalog — source of truth remains code until CMS added. */
export function getPurchaseCatalog() {
  return {
    listPriceCentiCredit: LIST_PRICE_CENTI_CREDIT,
    plans: PLAN_PACKAGES,
    topups: TOPUP_TIERS,
    source: "code" as const,
    note: "EUR purchase packages are defined in src/lib/credits/money.ts. Generation credit costs are in app_settings.pricing.",
  };
}
