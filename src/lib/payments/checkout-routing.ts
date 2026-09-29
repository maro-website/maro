export type CheckoutProvider = "paddle";

export function checkoutProvider(value: string | null): CheckoutProvider | null {
  return value === null || value === "paddle" ? "paddle" : null;
}

export function checkoutEntryUrl(itemId: string, provider: CheckoutProvider = "paddle", promo?: string) {
  const params = new URLSearchParams({ item: itemId, provider });
  if (promo) params.set("promo", promo);
  return `/checkout?${params}`;
}

export function checkoutDestination(provider: CheckoutProvider, paddleAvailable: boolean) {
  if (provider !== "paddle" || !paddleAvailable) throw new Error("paddle_unavailable");
  return { endpoint: "/api/payments/paddle/checkout", paymentPath: "/pay/paddle" };
}
