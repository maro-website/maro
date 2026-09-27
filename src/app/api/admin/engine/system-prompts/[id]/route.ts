import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import { updateDraftContent } from "@/lib/engine/promptVersions";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }

  const auth = await requirePermission(req, "engine.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await ctx.params;
  let body: { content?: string; changeNote?: string; status?: "draft" | "review" };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  try {
    const updated = await updateDraftContent(id, body);
    await writeAuditEvent({
      actorId: auth.admin.userId,
      action: "engine.system_prompt.update_draft",
      targetType: "system_prompt_version",
      targetId: id,
      requestId: auth.requestId,
    });
    return NextResponse.json({ version: updated });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
