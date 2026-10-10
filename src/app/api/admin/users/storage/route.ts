import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/admin/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";

export const dynamic = "force-dynamic";
const schema = z.object({ userId: z.uuid(), limitBytes: z.number().int().min(0).max(1_000_000_000_000).nullable(), reason: z.string().trim().min(3).max(1000) }).strict();
export async function POST(req: Request) {
  const auth = await requirePermission(req, "users.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const bounded = await readJsonBody(req, REQUEST_LIMITS.jsonDefault);
  if (!bounded.ok) return bounded.response;
  const parsed = schema.safeParse(bounded.body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const { data, error } = await getSupabaseAdmin().rpc("admin_set_user_storage", {
    p_actor: auth.admin.userId, p_user: parsed.data.userId, p_limit_bytes: parsed.data.limitBytes, p_note: parsed.data.reason,
  });
  if (error) return NextResponse.json({ error: error.code === "PGRST202" ? "rpc_missing" : "storage_save_failed" }, { status: 503 });
  if (!data?.ok) return NextResponse.json({ error: data?.error ?? "storage_save_failed" }, { status: data?.error === "user_not_found" ? 404 : 403 });
  return NextResponse.json(data);
}
