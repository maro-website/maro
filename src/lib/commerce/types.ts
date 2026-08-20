/** Canonical commerce types — plans, memberships, entitlements, orders. */

export type CanonicalPlanId = "standard" | "pro" | "business";

export type MembershipStatus =
  | "NO_PLAN"
  | "ACTIVE"
  | "RENEWAL_WINDOW"
  | "EXPIRED"
  | "BUSINESS_ACTIVE"
  | "BUSINESS_EXPIRED"
  | "BUSINESS_SUSPENDED";

export type OrderKind =
  | "plan_purchase"
  | "plan_renewal"
  | "plan_upgrade"
  | "topup"
  | "business_payment";

export type RenewalMode = "manual" | "automatic";

export interface CommercePlanRow {
  id: CanonicalPlanId;
  enabled: boolean;
  display_name: string;
  description: string;
  price_cents: number;
  currency: string;
  included_credits: number;
  duration_days: number;
  workspace_limit: number;
  concurrency_limit: number;
  renewal_window_days: number;
  renewal_mode: RenewalMode;
  recommended_badge: string | null;
  sort_order: number;
  contact_only: boolean;
  metadata: Record<string, unknown>;
}

export interface CommerceTopupRow {
  id: string;
  credits: number;
  price_cents: number;
  currency: string;
  enabled: boolean;
  sort_order: number;
  requires_active_plan: boolean;
}

export interface MembershipRow {
  id: string;
  user_id: string;
  plan_id: CanonicalPlanId;
  started_at: string;
  expires_at: string;
  renewal_mode: RenewalMode;
  renewed_from_id: string | null;
  cycle_renewal_fulfilled_at: string | null;
  business_overrides: BusinessOverrides;
  suspended: boolean;
  persisted_status: string | null;
}

export interface BusinessOverrides {
  workspace_limit?: number;
  concurrency_limit?: number;
  included_credits?: number;
  notes?: string;
}

export interface CommercialSnapshot {
  captured_at: string;
  order_kind: OrderKind;
  plan_id?: CanonicalPlanId;
  plan_name_snapshot?: string;
  price_cents: number;
  currency: string;
  credits_snapshot: number;
  duration_days?: number;
  renewal_window_days?: number;
  topup_id?: string;
  upgrade_from?: CanonicalPlanId;
  upgrade_to?: CanonicalPlanId;
  business_overrides?: BusinessOverrides;
  config_version?: string;
}

export interface ResolvedEntitlements {
  plan_id: CanonicalPlanId | null;
  plan_status: MembershipStatus;
  plan_display_name: string | null;
  started_at: string | null;
  expires_at: string | null;
  renewal_mode: RenewalMode;
  renewal_available: boolean;
  credits_balance: number;
  credits_reserved: number;
  credits_available: number;
  can_top_up: boolean;
  workspace_limit: number;
  current_workspace_count: number;
  can_create_workspace: boolean;
  concurrency_limit: number;
  maro_brain_access: boolean;
  maro_presets_access: boolean;
  business_overrides: BusinessOverrides | null;
  membership_id: string | null;
}

export interface UpgradeQuote {
  from_plan: CanonicalPlanId;
  to_plan: CanonicalPlanId;
  price_cents: number;
  credits: number;
  currency: string;
  eligible: boolean;
  reason?: string;
}

export const EXPIRED_DEFAULTS = {
  workspace_limit: 1,
  concurrency_limit: 1,
  can_top_up: false,
} as const;
