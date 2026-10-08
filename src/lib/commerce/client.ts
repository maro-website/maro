import type { ResolvedEntitlements, UpgradeQuote } from "./types";

export interface CommerceEntitlementsPayload {
  entitlements: ResolvedEntitlements;
  upgradeQuote: UpgradeQuote;
}

export async function fetchCommerceEntitlements(token: string | null, signal?: AbortSignal): Promise<CommerceEntitlementsPayload> {
  if (!token) throw new Error("commerce_auth_required");
  const response = await fetch("/api/commerce/entitlements", {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal,
  });
  if (!response.ok) throw new Error("commerce_entitlements_unavailable");
  const data = await response.json() as CommerceEntitlementsPayload;
  if (!data.entitlements || typeof data.entitlements.can_top_up !== "boolean" ||
      !["NO_PLAN", "ACTIVE", "RENEWAL_WINDOW", "EXPIRED", "BUSINESS_ACTIVE", "BUSINESS_EXPIRED", "BUSINESS_SUSPENDED"].includes(data.entitlements.plan_status)) {
    throw new Error("commerce_entitlements_invalid");
  }
  return data;
}
