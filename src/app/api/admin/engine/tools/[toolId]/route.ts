import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import { isEngineToolId } from "@/lib/engine/toolRegistry";
import { ensureEngineSeeded } from "@/lib/engine/seed";
import { getEngineToolDetail } from "@/lib/engine/storage";
import { collectToolWarnings } from "@/lib/engine/warnings";
import { canSetPipeline } from "@/lib/engine/engineIntegrationPolicy";
import { canEnableShadowPipeline } from "@/lib/engine/configHealth";
import { evaluateMaroWebShadowPreconditions } from "@/lib/engine/maroWebShadowPreconditions";
import { isFeatureEnabled, FEATURE_PROMPT_COMPILER_V2 } from "@/lib/features/flags";
import { getSupabaseAdmin, supabaseServerConfigured } from "@/lib/supabase/server";

import type { EngineToolId } from "@/lib/engine/types";

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
  if (!isEngineToolId(toolId)) {
    return NextResponse.json({ error: "unknown_tool" }, { status: 404 });
  }

  await ensureEngineSeeded(auth.admin.userId);
  const detail = await getEngineToolDetail(toolId as EngineToolId);
  if (!detail) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const live = detail.prompts.find((p) => p.status === "live") ?? null;
  const draft = detail.prompts.find((p) => p.status === "draft") ?? null;
  const warnings = collectToolWarnings({
    tool: detail.tool,
    livePrompt: live,
    draftPrompt: draft,
    models: detail.models,
    promptCompilerV2: detail.promptCompilerV2,
  });

  return NextResponse.json({
    ...detail,
    warnings,
    configHealth: detail.configHealth,
  });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ toolId: string }> }
) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }

  const auth = await requirePermission(req, "engine.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { toolId } = await ctx.params;
  if (!isEngineToolId(toolId)) {
    return NextResponse.json({ error: "unknown_tool" }, { status: 404 });
  }

  let body: {
    status?: string;
    defaultModelId?: string;
    usesBrain?: boolean;
    usesFort?: boolean;
    brainMapping?: Record<string, unknown>;
    productionPipeline?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  if (body.productionPipeline) {
    const promptCompilerV2 = await isFeatureEnabled(FEATURE_PROMPT_COMPILER_V2);
    const allowed = canSetPipeline(
      body.productionPipeline as "legacy" | "shadow" | "engine",
      toolId as EngineToolId,
      "2b1",
      promptCompilerV2
    );
    if (!allowed.ok) {
      return NextResponse.json({ error: allowed.error }, { status: 403 });
    }
    if (body.productionPipeline === "shadow") {
      const detail = await getEngineToolDetail(toolId as EngineToolId);
      if (detail?.configHealth && !canEnableShadowPipeline(detail.configHealth)) {
        return NextResponse.json({ error: "tool_config_blocked", health: detail.configHealth }, { status: 400 });
      }
      if (toolId === "maro_web" && detail) {
        const readiness = evaluateMaroWebShadowPreconditions({
          tool: detail.tool,
          prompts: detail.prompts,
          layers: detail.layers,
          fields: detail.fields,
          models: detail.models,
          promptCompilerV2: detail.promptCompilerV2,
        });
        if (!readiness.ok) {
          return NextResponse.json({ error: "maroweb_shadow_preconditions_failed", blockers: readiness.blockers }, { status: 400 });
        }
      }
    }
  }

  const patch: Record<string, unknown> = {
    updated_by: auth.admin.userId,
    updated_at: new Date().toISOString(),
  };
  if (body.status) patch.status = body.status;
  if (body.defaultModelId != null) patch.default_model_id = body.defaultModelId;
  if (body.usesBrain != null) patch.uses_brain = body.usesBrain;
  if (body.usesFort != null) patch.uses_fort = body.usesFort;
  if (body.brainMapping) patch.brain_mapping = body.brainMapping;
  if (body.productionPipeline) patch.production_pipeline = body.productionPipeline;

  const { data, error } = await getSupabaseAdmin()
    .from("tool_engine_config")
    .update(patch)
    .eq("tool_id", toolId)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (body.productionPipeline) {
    await writeAuditEvent({
      actorId: auth.admin.userId,
      action: "engine.pipeline.update",
      targetType: "tool_engine_config",
      targetId: toolId,
      after: { productionPipeline: body.productionPipeline },
      requestId: auth.requestId,
    });
  }

  await writeAuditEvent({
    actorId: auth.admin.userId,
    action: "engine.tool_config.update",
    targetType: "tool_engine_config",
    targetId: toolId,
    after: patch,
    requestId: auth.requestId,
  });

  return NextResponse.json({ config: data });
}
