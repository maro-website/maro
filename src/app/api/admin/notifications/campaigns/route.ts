import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import { listNotificationCampaigns, upsertNotificationCampaign } from "@/lib/notifications/campaigns";
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
    audience?: string;
    active?: boolean;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  if (!body.title?.trim() || !body.kind) {
    return NextResponse.json({ error: "title_and_kind_required" }, { status: 400 });
  }

  const campaign = await upsertNotificationCampaign({
    id: body.id,
    kind: body.kind,
    title: body.title,
    body: body.body,
    toolId: body.toolId,
    audience: body.audience,
    active: body.active,
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
