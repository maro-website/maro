import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import { rollbackSystemPromptVersion } from "@/lib/engine/promptVersions";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }

  const auth = await requirePermission(req, "engine.publish");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await ctx.params;

  try {
    const live = await rollbackSystemPromptVersion(id, auth.admin.userId);
    await writeAuditEvent({
      actorId: auth.admin.userId,
      action: "engine.system_prompt.rollback",
      targetType: "system_prompt_version",
      targetId: id,
      after: { versionLabel: live.versionLabel, toolId: live.toolId },
      requestId: auth.requestId,
    });
    return NextResponse.json({ version: live });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
