import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import { archiveNotificationCampaign, listNotificationCampaigns, upsertNotificationCampaign } from "@/lib/notifications/campaigns";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const auth = await requirePermission(req, "notifications.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const campaigns = await listNotificationCampaigns();
  return NextResponse.json({ campaigns });
}

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const auth = await requirePermission(req, "notifications.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: {
    id?: string;
    kind?: "global_banner" | "tool_banner" | "in_app";
    title?: string;
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
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  if (!body.title?.trim() || !body.kind) {
    return NextResponse.json({ error: "title_and_kind_required" }, { status: 400 });
  }
  if (body.kind === "in_app") {
    return NextResponse.json({ error: "unsupported_placement" }, { status: 400 });
  }
  const ctaUrl = body.ctaUrl?.trim() || null;
  if (ctaUrl && !isSafeCtaUrl(ctaUrl)) {
    return NextResponse.json({ error: "invalid_cta_url" }, { status: 400 });
  }

  const campaign = await upsertNotificationCampaign({
    id: body.id,
    kind: body.kind,
    title: body.title,
    body: body.body,
    toolId: body.toolId,
    targetModules: body.targetModules,
    audience: body.audience,
    active: body.active,
    dismissible: body.dismissible,
    startsAt: body.startsAt,
    endsAt: body.endsAt,
    ctaLabel: body.ctaLabel,
    ctaUrl,
    priority: body.priority,
    createdBy: auth.admin.userId,
  });

  await writeAuditEvent({
    actorId: auth.admin.userId,
    action: body.id ? "notifications.campaign.update" : "notifications.campaign.create",
    targetType: "notification_campaigns",
    targetId: campaign.id as string,
    requestId: auth.requestId,
  });

  return NextResponse.json({ campaign });
}

function isSafeCtaUrl(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function DELETE(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const auth = await requirePermission(req, "notifications.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });
  await archiveNotificationCampaign(id);
  await writeAuditEvent({
    actorId: auth.admin.userId,
    action: "notifications.campaign.archive",
    targetType: "notification_campaigns",
    targetId: id,
    requestId: auth.requestId,
  });
  return NextResponse.json({ ok: true });
}
