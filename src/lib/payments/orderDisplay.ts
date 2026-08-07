/** Client-safe order status labels and helpers. */

export type OrderDisplayStatus = "paid" | "pending" | "cancelled" | "failed";

export function resolveOrderDisplayStatus(
  status: string,
  cancelReason?: string | null
): OrderDisplayStatus {
  if (status === "paid") return "paid";
  if (status === "pending") return "pending";
  if (status === "cancelled" && cancelReason === "declined") return "failed";
  if (status === "cancelled") return "cancelled";
  return "pending";
}

export const ORDER_STATUS_LABELS: Record<OrderDisplayStatus, string> = {
  paid: "E paguar",
  pending: "Në pritje",
  cancelled: "Anuluar",
  failed: "Refuzuar",
};

export function formatOrderAmount(amountCents: number, currency = "EUR"): string {
  return `${(amountCents / 100).toFixed(2)} ${currency}`;
}

export function formatOrderDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("sq-AL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type AccountTab = "profile" | "preferences" | "security" | "orders" | "danger";

export const ACCOUNT_TABS: { id: AccountTab; label: string }[] = [
  { id: "profile", label: "Profili" },
  { id: "preferences", label: "Preferencat" },
  { id: "security", label: "Siguria" },
  { id: "orders", label: "Porositë e mia" },
  { id: "danger", label: "Zona e rrezikut" },
];

export function parseAccountTab(value: string | null): AccountTab {
  const ids = new Set(ACCOUNT_TABS.map((t) => t.id));
  if (value && ids.has(value as AccountTab)) return value as AccountTab;
  return "profile";
}
