/** Single source of truth for credit purchase pricing (EUR). */

export const LIST_PRICE_CENTI_CREDIT = 9;

export type MaroPlanId = "standard" | "pro" | "biz";
export type CheckoutItemId =
  | "standard"
  | "pro"
  | "topup-100"
  | "topup-200"
  | "topup-500"
  | "topup-1000";

export interface PlanFeature {
  text: string;
}

export interface PlanPackage {
  id: MaroPlanId;
  name: string;
  tagline: string;
  credits: number;
  priceEur: number;
  features: PlanFeature[];
  checkoutId: CheckoutItemId;
  badge?: string;
  contactOnly?: boolean;
}

export interface TopUpTier {
  id: CheckoutItemId;
  credits: number;
  priceEur: number;
  discountPct?: number;
}

export const PLAN_PACKAGES: PlanPackage[] = [
  {
    id: "standard",
    name: "maroStandard",
    tagline: "Fillim i shpejtë me AI",
    credits: 100,
    priceEur: 9,
    checkoutId: "standard",
    features: [
      { text: "100 kredite maro" },
      { text: "Akses në maroPresets" },
      { text: "~12–14 imazhe ose logo" },
      { text: "~2 faqe web" },
      { text: "Kreditet nuk skadojnë" },
    ],
  },
  {
    id: "pro",
    name: "maroPro",
    tagline: "Për krijues aktivë",
    credits: 500,
    priceEur: 35,
    checkoutId: "pro",
    badge: "Më i popullarizuari",
    features: [
      { text: "500 kredite maro" },
      { text: "Akses në maroPresets" },
      { text: "~62–83 imazhe ose logo" },
      { text: "~12 faqe web" },
      { text: "maroFort falas për 14 ditë" },
      { text: "Akses i hershëm në vegla të reja" },
      { text: "Deri në 3 gjenerime njëkohësisht" },
      { text: "Kreditet nuk skadojnë" },
    ],
  },
  {
    id: "biz",
    name: "maroBiz",
    tagline: "Për ekipe dhe biznese",
    credits: 0,
    priceEur: 0,
    checkoutId: "standard",
    contactOnly: true,
    features: [
      { text: "Kredite sipas nevojës tuaj" },
      { text: "maroPresets të personalizuara" },
      { text: "Prompt Engineering nga ekipi i maro" },
      { text: "maroFort aktiv 24/7" },
      { text: "Deri në 10 gjenerime njëkohësisht" },
      { text: "20% zbritje në çdo rimbushje" },
      { text: "Mbështetje prioritare" },
    ],
  },
];

export const TOPUP_TIERS: TopUpTier[] = [
  { id: "topup-100", credits: 100, priceEur: 9 },
  { id: "topup-200", credits: 200, priceEur: 17, discountPct: 6 },
  { id: "topup-500", credits: 500, priceEur: 40, discountPct: 11 },
  { id: "topup-1000", credits: 1000, priceEur: 75, discountPct: 17 },
];

export function listPriceEur(credits: number): number {
  return (credits * LIST_PRICE_CENTI_CREDIT) / 100;
}

export function listPriceCents(credits: number): number {
  return credits * LIST_PRICE_CENTI_CREDIT;
}

export function formatEur(eur: number): string {
  return `€${eur.toFixed(2)}`;
}

export function creditsPerEuro(priceEur: number, credits: number): number {
  if (priceEur <= 0) return 0;
  return Math.round(credits / priceEur);
}

export function getCheckoutItem(itemId: string): {
  itemType: "plan" | "topup";
  itemId: CheckoutItemId;
  credits: number;
  priceEur: number;
  priceCents: number;
  label: string;
  maroPlan?: MaroPlanId;
} | null {
  const plan = PLAN_PACKAGES.find((p) => p.checkoutId === itemId && !p.contactOnly);
  if (itemId === "standard" || itemId === "pro") {
    const p = PLAN_PACKAGES.find((x) => x.id === itemId);
    if (!p || p.contactOnly) return null;
    return {
      itemType: "plan",
      itemId: itemId as CheckoutItemId,
      credits: p.credits,
      priceEur: p.priceEur,
      priceCents: Math.round(p.priceEur * 100),
      label: p.name,
      maroPlan: p.id,
    };
  }
  const topup = TOPUP_TIERS.find((t) => t.id === itemId);
  if (topup) {
    return {
      itemType: "topup",
      itemId: topup.id,
      credits: topup.credits,
      priceEur: topup.priceEur,
      priceCents: Math.round(topup.priceEur * 100),
      label: `${topup.credits.toLocaleString("de-DE")} kredite`,
    };
  }
  void plan;
  return null;
}
