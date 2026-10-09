import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";
import { validatePromptContent } from "@/lib/admin/v1Configuration";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import {
  createDraftFromLive,
  listSystemPromptVersions,
  updateDraftContent,
} from "@/lib/engine/promptVersions";
import { isEngineToolId } from "@/lib/engine/toolRegistry";
import type { EngineToolId } from "@/lib/engine/types";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ toolId: string }> }
) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }

  const auth = await requirePermission(req, "engine.view");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { toolId } = await ctx.params;
  if (!isEngineToolId(toolId)) return NextResponse.json({ error: "unknown_tool" }, { status: 404 });

  const versions = await listSystemPromptVersions(toolId as EngineToolId);
  return NextResponse.json({ versions });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ toolId: string }> }
) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }

  const auth = await requirePermission(req, "engine.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { toolId } = await ctx.params;
  if (!isEngineToolId(toolId)) return NextResponse.json({ error: "unknown_tool" }, { status: 404 });

  let body: { action?: string; content?: string; changeNote?: string; status?: "draft" | "review" };
  const boundedBody = await readJsonBody(req, REQUEST_LIMITS.jsonAi);
  if (!boundedBody.ok) return boundedBody.response;
  if (!boundedBody.body || typeof boundedBody.body !== "object" || Array.isArray(boundedBody.body)) return NextResponse.json({ error: "bad-json" }, { status: 400 });
  try {
    body = boundedBody.body as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  if (body.action === "create_draft") {
    const draft = await createDraftFromLive(
      toolId as EngineToolId,
      auth.admin.userId,
      body.changeNote
    );
    await writeAuditEvent({
      actorId: auth.admin.userId,
      action: "engine.system_prompt.create_draft",
      targetType: "system_prompt_version",
      targetId: draft.id,
      requestId: auth.requestId,
    });
    return NextResponse.json({ version: draft });
  }

  if (body.content != null) {
    try { validatePromptContent(body.content); } catch { return NextResponse.json({ error: "invalid_prompt_content" }, { status: 400 }); }
    const draft = await createDraftFromLive(toolId as EngineToolId, auth.admin.userId);
    const updated = await updateDraftContent(draft.id, {
      content: body.content,
      changeNote: body.changeNote,
      status: body.status,
    });
    return NextResponse.json({ version: updated });
  }

  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}
