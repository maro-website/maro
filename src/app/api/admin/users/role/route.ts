import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import { countSuperAdmins } from "@/lib/admin/accessOverview";
import { getSupabaseAdmin, supabaseServerConfigured } from "@/lib/supabase/server";
import { isAccessRole, resolveAccessRole, type AccessRole } from "@/lib/admin/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }

  const auth = await requirePermission(req, "users.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { userId?: string; accessRole?: AccessRole | null; reason?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  const userId = String(body.userId ?? "").trim();
  if (!userId) return NextResponse.json({ error: "missing_user" }, { status: 400 });

  const nextRole = body.accessRole === null ? null : body.accessRole;
  if (nextRole !== null && !isAccessRole(nextRole)) {
    return NextResponse.json({ error: "invalid_role" }, { status: 400 });
  }

  if (nextRole === "super_admin" && auth.admin.role !== "super_admin") {
    return NextResponse.json({ error: "insufficient_permission" }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  const { data: target } = await admin
    .from("profiles")
    .select("access_role, is_admin, email")
    .eq("id", userId)
    .maybeSingle();

  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const currentRole = resolveAccessRole({
    access_role: target.access_role as string | null,
    is_admin: target.is_admin as boolean,
  });

  if (
    target.access_role === "super_admin" &&
    auth.admin.role !== "super_admin" &&
    auth.admin.userId !== userId
  ) {
    return NextResponse.json({ error: "cannot_modify_super_admin" }, { status: 403 });
  }

  if (auth.admin.userId === userId && currentRole === "super_admin" && nextRole !== "super_admin") {
    const otherSuperAdmins = await countSuperAdmins(userId);
    if (otherSuperAdmins === 0) {
      return NextResponse.json({ error: "last_super_admin_self_lockout" }, { status: 403 });
    }
  }

  const { error } = await admin
    .from("profiles")
    .update({
      access_role: nextRole,
      is_admin: nextRole !== null,
    })
    .eq("id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const reason = body.reason?.trim();
  await writeAuditEvent({
    actorId: auth.admin.userId,
    action: "user.role_changed",
    targetType: "user",
    targetId: userId,
    before: { access_role: target.access_role, is_admin: target.is_admin },
    after: { access_role: nextRole, is_admin: nextRole !== null },
    requestId: auth.requestId,
    metadata: reason ? { reason } : {},
  });

  return NextResponse.json({ ok: true, accessRole: nextRole });
}
