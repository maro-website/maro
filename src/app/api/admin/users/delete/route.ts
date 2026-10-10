import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/admin/auth";
import { verifyAdminActionMfa } from "@/lib/admin/actionMfa";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";
import { writeAuditEvent } from "@/lib/admin/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requirePermission(req, "users.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await readJsonBody(req, REQUEST_LIMITS.jsonDefault);
  if (!body.ok) return body.response;
  const checked = z.object({ userId: z.uuid(), email: z.email(), mfaCode: z.string().regex(/^\d{6}$/) }).strict().safeParse(body.body);
  if (!checked.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const mfa = await verifyAdminActionMfa(req, auth.admin.userId, checked.data.mfaCode);
  if (mfa) return mfa;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("admin_begin_user_delete", { p_actor: auth.admin.userId, p_user: checked.data.userId, p_email: checked.data.email });
  if (error || !data) return NextResponse.json({ error: error?.code === "PGRST202" ? "rpc_missing" : "delete_unavailable" }, { status: 503 });
  if (!data.ok) return NextResponse.json({ error: data.error }, { status: data.error === "user_not_found" ? 404 : 409 });
  // Enumerate every object before removing any; PostgREST pages RPC table results.
  const objects: Array<{ bucket_id: string; name: string }> = [];
  for (let offset = 0; offset < 100000; offset += 500) {
    const page = await admin.rpc("admin_user_storage_objects", { p_user: checked.data.userId }).range(offset, offset + 499);
    if (page.error) return NextResponse.json({ error: "delete_cleanup_pending" }, { status: 503 });
    objects.push(...(page.data ?? []));
    if ((page.data?.length ?? 0) < 500) break;
    if (offset === 99500) return NextResponse.json({ error: "delete_cleanup_pending" }, { status: 503 });
  }
  for (const bucket of new Set(objects.map(object => object.bucket_id))) {
    const names = objects.filter(object => object.bucket_id === bucket).map(object => object.name);
    for (let offset = 0; offset < names.length; offset += 100) {
      const removed = await admin.storage.from(bucket).remove(names.slice(offset, offset + 100));
      if (removed.error) return NextResponse.json({ error: "delete_cleanup_pending" }, { status: 503 });
    }
  }
  // Remove the account's published posts as well as their underlying files.
  const publications = await admin.from("public_creations").delete().eq("user_id", checked.data.userId);
  if (publications.error) return NextResponse.json({ error: "delete_cleanup_pending" }, { status: 503 });
  const deleted = await admin.auth.admin.deleteUser(checked.data.userId, false);
  if (deleted.error) return NextResponse.json({ error: "delete_cleanup_pending" }, { status: 503 });
  await writeAuditEvent({ actorId: auth.admin.userId, action: "users.deleted", targetType: "user", targetId: checked.data.userId, requestId: auth.requestId, metadata: { financial_history_retained: true } });
  return NextResponse.json({ ok: true });
}
