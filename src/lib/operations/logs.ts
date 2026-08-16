import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface AuditLogRow {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  before: unknown;
  after: unknown;
  requestId: string | null;
  createdAt: string;
}

export async function listAuditEvents(limit = 100): Promise<AuditLogRow[]> {
  const { data } = await getSupabaseAdmin()
    .from("audit_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r) => ({
    id: r.id as string,
    actorId: (r.actor_id as string) ?? null,
    action: r.action as string,
    targetType: (r.target_type as string) ?? null,
    targetId: (r.target_id as string) ?? null,
    before: r.before_state,
    after: r.after_state,
    requestId: (r.request_id as string) ?? null,
    createdAt: r.created_at as string,
  }));
}

export interface GenerationLogRow {
  id: string;
  userId: string;
  tool: string;
  credits: number;
  createdAt: string;
}

export async function listRecentGenerations(limit = 50): Promise<GenerationLogRow[]> {
  const { data } = await getSupabaseAdmin()
    .from("generations")
    .select("id, user_id, tool, credits, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    tool: (r.tool as string) ?? "unknown",
    credits: (r.credits as number) ?? 0,
    createdAt: r.created_at as string,
  }));
}

export interface SecurityEventRow {
  id: string;
  eventType: string;
  severity: string;
  userId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export async function listSecurityEvents(limit = 50): Promise<SecurityEventRow[]> {
  const { data } = await getSupabaseAdmin()
    .from("security_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r) => ({
    id: r.id as string,
    eventType: r.event_type as string,
    severity: (r.severity as string) ?? "info",
    userId: (r.user_id as string) ?? null,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    createdAt: r.created_at as string,
  }));
}

export async function listFeatureFlags() {
  const { data } = await getSupabaseAdmin().from("feature_flags").select("*").order("key");
  return data ?? [];
}

export async function listBudgetGuards() {
  const { data } = await getSupabaseAdmin().from("budget_guards").select("*").order("scope");
  return data ?? [];
}
