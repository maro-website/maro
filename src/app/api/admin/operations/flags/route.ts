import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import { clearFeatureFlagCache } from "@/lib/features/flags";
import { getSupabaseAdmin, supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const auth = await requirePermission(req, "security.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { key?: string; enabled?: boolean; guardId?: string; enabledGuard?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  if (body.key !== undefined) {
  const frozen = ["prompt_compiler_v2", "raiffeisen_live", "preset_reveal_enabled"];
    if (frozen.includes(body.key) && body.enabled === true) {
      return NextResponse.json({ error: "flag_frozen_by_production_policy" }, { status: 403 });
    }

    const { data, error } = await getSupabaseAdmin()
      .from("feature_flags")
      .update({ enabled: Boolean(body.enabled) })
      .eq("key", body.key)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    clearFeatureFlagCache();
    await writeAuditEvent({
      actorId: auth.admin.userId,
      action: "operations.feature_flag.update",
      targetType: "feature_flags",
      targetId: body.key,
      after: data as Record<string, unknown>,
      requestId: auth.requestId,
    });
    return NextResponse.json({ flag: data });
  }

  if (body.guardId !== undefined) {
    const { data, error } = await getSupabaseAdmin()
      .from("budget_guards")
      .update({ enabled: Boolean(body.enabledGuard), updated_at: new Date().toISOString() })
      .eq("id", body.guardId)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await writeAuditEvent({
      actorId: auth.admin.userId,
      action: "operations.budget_guard.update",
      targetType: "budget_guards",
      targetId: body.guardId,
      after: data as Record<string, unknown>,
      requestId: auth.requestId,
    });
    return NextResponse.json({ guard: data });
  }

  return NextResponse.json({ error: "invalid_body" }, { status: 400 });
}
