import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface CampaignRow {
  id: string;
  kind: string;
  title: string;
  body: string;
  toolId: string | null;
  targetModules: string[];
  audience: string;
  active: boolean;
  dismissible: boolean;
  startsAt: string | null;
  endsAt: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  priority: number;
  archivedAt: string | null;
  createdAt: string;
}

export async function listNotificationCampaigns(): Promise<CampaignRow[]> {
  const { data } = await getSupabaseAdmin()
    .from("notification_campaigns")
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  return (data ?? []).map((r) => ({
    id: r.id as string,
    kind: r.kind as string,
    title: r.title as string,
    body: (r.body as string) ?? "",
    toolId: (r.tool_id as string) ?? null,
    targetModules: Array.isArray(r.target_modules)
      ? (r.target_modules as string[])
      : r.tool_id
        ? [r.tool_id as string]
        : ["all"],
    audience: (r.audience as string) ?? "all",
    active: r.active as boolean,
    dismissible: r.dismissible as boolean,
    startsAt: (r.starts_at as string) ?? null,
    endsAt: (r.ends_at as string) ?? null,
    ctaLabel: (r.cta_label as string) ?? null,
    ctaUrl: (r.cta_url as string) ?? null,
    priority: (r.priority as number) ?? 0,
    archivedAt: (r.archived_at as string) ?? null,
    createdAt: r.created_at as string,
  }));
}

export async function upsertNotificationCampaign(input: {
  id?: string;
  kind: "global_banner" | "tool_banner" | "in_app";
  title: string;
  body?: string;
  toolId?: string | null;
  targetModules?: string[];
  audience?: string;
  active?: boolean;
  dismissible?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  priority?: number;
  createdBy?: string;
}) {
  const row = {
    kind: input.kind,
    title: input.title.trim(),
    body: input.body?.trim() ?? "",
    tool_id: input.toolId ?? null,
    target_modules: input.targetModules?.length ? input.targetModules : ["all"],
    audience: input.audience ?? "all",
    active: input.active ?? false,
    dismissible: input.dismissible ?? true,
    starts_at: input.startsAt || null,
    ends_at: input.endsAt || null,
    cta_label: input.ctaLabel?.trim() || null,
    cta_url: input.ctaUrl?.trim() || null,
    priority: Number.isFinite(input.priority) ? Math.trunc(input.priority!) : 0,
    updated_at: new Date().toISOString(),
    ...(input.createdBy && !input.id ? { created_by: input.createdBy } : {}),
  };

  if (input.id) {
    const { data, error } = await getSupabaseAdmin()
      .from("notification_campaigns")
      .update(row)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  const { data, error } = await getSupabaseAdmin().from("notification_campaigns").insert(row).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function archiveNotificationCampaign(id: string) {
  const { error } = await getSupabaseAdmin()
    .from("notification_campaigns")
    .update({ active: false, archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
