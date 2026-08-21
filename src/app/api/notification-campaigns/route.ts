import { NextResponse } from "next/server";
import { requireUser } from "@/lib/payments/auth";
import { getSupabaseAdmin, supabaseServerConfigured } from "@/lib/supabase/server";
import { isNoticeEligible } from "@/lib/notifications/active";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function placementKind(value: string | null): "global_banner" | "tool_banner" {
  return value === "global" ? "global_banner" : "tool_banner";
}

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ campaigns: [] });
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const moduleId = url.searchParams.get("module") || "platform";
  const now = new Date().toISOString();
  const kind = placementKind(url.searchParams.get("placement"));
  const admin = getSupabaseAdmin();

  const [{ data, error }, { data: dismissals, error: dismissalError }] = await Promise.all([
    admin
      .from("notification_campaigns")
      .select("id, kind, title, body, cta_label, cta_url, target_modules, priority, dismissible, starts_at, ends_at, updated_at")
      .eq("kind", kind)
      .eq("active", true)
      .is("archived_at", null)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gt.${now}`)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false }),
    admin
      .from("notification_dismissals")
      .select("campaign_id, dismissed_at")
      .eq("user_id", user.id),
  ]);
  if (error || dismissalError) {
    return NextResponse.json({ error: error?.message ?? dismissalError?.message }, { status: 500 });
  }

  const dismissedAt = new Map((dismissals ?? []).map((row) => [row.campaign_id as string, row.dismissed_at as string]));
  const campaigns = (data ?? [])
    .filter((row) => {
      const targets = Array.isArray(row.target_modules) ? (row.target_modules as string[]) : ["all"];
      return isNoticeEligible({ targets, moduleId, dismissedAt: dismissedAt.get(row.id as string) });
    })
    .map((row) => ({
      id: row.id as string,
      placement: kind === "global_banner" ? "global" : "promptbox",
      title: row.title as string,
      body: (row.body as string) ?? "",
      ctaLabel: (row.cta_label as string | null) ?? null,
      ctaUrl: (row.cta_url as string | null) ?? null,
      priority: (row.priority as number) ?? 0,
      dismissible: row.dismissible !== false,
    }));

  return NextResponse.json(
    { campaigns },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } }
  );
}

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "id_required" }, { status: 400 });

  const admin = getSupabaseAdmin();
  const { data: active } = await admin
    .from("notification_campaigns")
    .select("id, active, dismissible, archived_at")
    .eq("id", body.id)
    .maybeSingle();
  if (!active || active.active !== true || active.dismissible === false || active.archived_at) {
    return NextResponse.json({ error: "not_dismissible" }, { status: 409 });
  }

  const { error } = await admin.from("notification_dismissals").upsert(
    { user_id: user.id, campaign_id: body.id, dismissed_at: new Date().toISOString() },
    { onConflict: "user_id,campaign_id" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
