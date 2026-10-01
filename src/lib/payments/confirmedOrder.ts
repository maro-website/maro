export interface ConfirmedOrder {
  id: string;
  status: "paid";
  label: string;
  priceEur: number;
  credits: number;
  billing?: { fullName?: string; email?: string };
}

/** Read the existing authenticated order endpoint; never fulfill an order here. */
export async function loadConfirmedOrder(
  orderId: string,
  getAccessToken: () => Promise<string | null>,
  signal?: AbortSignal
): Promise<ConfirmedOrder | null> {
  if (!orderId) return null;
  try {
    const token = await getAccessToken();
    if (!token || signal?.aborted) return null;
    const response = await fetch(`/api/payments/order?orderId=${encodeURIComponent(orderId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal,
    });
    if (!response.ok) return null;
    const data = await response.json();
    const order = data?.order;
    if (
      !order || order.id !== orderId || order.status !== "paid" ||
      typeof order.priceEur !== "number" || !Number.isFinite(order.priceEur) ||
      typeof order.credits !== "number" || !Number.isFinite(order.credits)
    ) return null;
    return {
      id: order.id,
      status: "paid",
      label: typeof order.label === "string" ? order.label : "Porosia",
      priceEur: order.priceEur,
      credits: order.credits,
      billing: {
        fullName: typeof order.billing?.fullName === "string" ? order.billing.fullName : undefined,
        email: typeof order.billing?.email === "string" ? order.billing.email : undefined,
      },
    };
  } catch {
    return null;
  }
}
