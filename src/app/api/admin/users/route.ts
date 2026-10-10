import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";
import { z } from "zod";
import { hasPermission } from "@/lib/admin/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requirePermission(req, "users.view");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const query = new URL(req.url).searchParams;
  const checked = z.object({ search: z.string().max(100), offset: z.coerce.number().int().min(0), limit: z.coerce.number().int().min(1).max(100) }).safeParse({ search: query.get("search") ?? "", offset: query.get("offset") ?? 0, limit: query.get("limit") ?? 50 });
  if (!checked.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const { data, error } = await getSupabaseAdmin().rpc("admin_user_directory", { p_search: checked.data.search, p_offset: checked.data.offset, p_limit: checked.data.limit });
  if (error) return NextResponse.json({ error: "users_unavailable" }, { status: 503 });
  return NextResponse.json({ ...data, canManage: hasPermission(auth.admin.role, "users.manage"), canAdjustCredits: hasPermission(auth.admin.role, "credits.adjust"), canManageCreators: hasPermission(auth.admin.role, "creators.manage") }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const auth = await requirePermission(req, "creators.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const parsed = await readJsonBody(req, REQUEST_LIMITS.jsonDefault);
  if (!parsed.ok) return parsed.response;
  const checked = z.object({ userId: z.uuid(), isCreator: z.boolean() }).strict().safeParse(parsed.body);
  if (!checked.success) return NextResponse.json({ error: "invalid_creator_update" }, { status: 400 });
  const { data, error } = await getSupabaseAdmin().from("profiles").update({ is_creator: checked.data.isCreator }).eq("id", checked.data.userId).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "creator_save_failed" }, { status: 503 });
  if (!data) return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  await writeAuditEvent({ actorId: auth.admin.userId, action: "user.creator_changed", targetType: "profiles", targetId: checked.data.userId, after: { is_creator: checked.data.isCreator }, requestId: auth.requestId });
  return NextResponse.json({ ok: true });
}
