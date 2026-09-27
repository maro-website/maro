import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import { seedEngineFromLegacy } from "@/lib/engine/seed";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }

  const auth = await requirePermission(req, "engine.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const result = await seedEngineFromLegacy(auth.admin.userId);

  await writeAuditEvent({
    actorId: auth.admin.userId,
    action: "engine.seed",
    targetType: "maro_engine",
    after: result as unknown as Record<string, unknown>,
    requestId: auth.requestId,
  });

  return NextResponse.json({ ok: true, result });
}
