import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import { compileGenerationBrief } from "@/lib/engine/compiler";
import { validateToolConfiguration } from "@/lib/engine/configHealth";
import { resolveEngineToolId } from "@/lib/engine/toolRegistry";
import { getEngineToolDetail, loadCompileContext } from "@/lib/engine/storage";
import { supabaseServerConfigured } from "@/lib/supabase/server";
import type { CompileGenerationBriefInput, EngineToolId } from "@/lib/engine/types";
import { parseV1ImageRequest, resolveV1ImageRequest, v1ImageValidationResponse } from "@/lib/generation/v1ImageRequest";
import { compileTrustedImageRequest } from "@/lib/generation/v1ImagePrompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Read-only dry run — no provider calls, credits, or generation jobs. */
export async function POST(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }

  const auth = await requirePermission(req, "engine.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: CompileGenerationBriefInput & { draftId?: string; ownerUserId?: string; imageRequest?: Record<string, unknown>; logoWizard?: unknown; referenceIds?: string[] };
  const boundedBody = await readJsonBody(req, REQUEST_LIMITS.jsonAi);
  if (!boundedBody.ok) return boundedBody.response;
  if (!boundedBody.body || typeof boundedBody.body !== "object" || Array.isArray(boundedBody.body)) return NextResponse.json({ error: "bad-json" }, { status: 400 });
  try {
    body = boundedBody.body as unknown as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  const engineId = resolveEngineToolId(body.toolId);
  if (!engineId) {
    return NextResponse.json({ error: "unknown_tool" }, { status: 400 });
  }

  if (engineId === "maro_imazh" || engineId === "maro_logo") {
    try {
      const ownerId = body.ownerUserId ?? auth.admin.userId;
      const imageRequest = body.imageRequest ?? {
        toolId: engineId === "maro_logo" ? "logo" : "reklama", prompt: body.userPrompt,
        model: body.model || undefined, selections: body.selections, workspaceId: body.workspaceId,
        useWorkspaceBrand: body.useBrain === true, logoWizard: body.logoWizard,
        attachments: body.referenceIds, maroPrompt: body.presetId ? { id: body.presetId } : undefined,
      };
      const parsed = parseV1ImageRequest(imageRequest);
      if (parsed.module !== engineId) return NextResponse.json({ error: "conflicting_module" }, { status: 400 });
      const trusted = await resolveV1ImageRequest(parsed, ownerId);
      const { compilation } = await compileTrustedImageRequest(trusted, body.draftId);
      await writeAuditEvent({ actorId: auth.admin.userId, action: "engine.compile_dry_run", targetType: "engine_tool", targetId: engineId,
        metadata: { canonicalHash: compilation.provenance.promptHash, configurationHash: compilation.configurationHash, ownerUserId: ownerId }, requestId: auth.requestId });
      return NextResponse.json({ ok: true, previewDraftId: body.draftId ?? null, canonical: compilation,
        brief: { systemPromptVersion: { id: compilation.provenance.system.id, versionLabel: compilation.provenance.system.version }, renderedProviderPrompt: compilation.prompt },
        providerMessages: { systemInstructions: "", userContent: compilation.prompt },
        estimatedCredits: { total: trusted.snapshot.model.customerCredits }, configHealth: { status: "healthy" },
        brain: { loaded: compilation.provenance.brainUsed }, productionPipeline: "canonical_v1" });
    } catch (error) { return v1ImageValidationResponse(error); }
  }

  const ownerUserId = body.ownerUserId ?? body.userId;
  const ctx = await loadCompileContext(engineId, {
    ownerUserId,
    workspaceId: body.workspaceId,
    adminInspection: true,
  });

  const brief = compileGenerationBrief({ ...body, toolId: engineId, userId: ownerUserId }, ctx);

  const detail = await getEngineToolDetail(engineId);
  const configHealth = validateToolConfiguration({
    tool: ctx.tool,
    prompts: detail?.prompts ?? (ctx.systemPrompt ? [ctx.systemPrompt] : []),
    layers: ctx.layers,
    fields: ctx.inputFields,
    models: ctx.models,
    promptCompilerV2: ctx.promptCompilerV2,
  });

  await writeAuditEvent({
    actorId: auth.admin.userId,
    action: "engine.compile_dry_run",
    targetType: "engine_tool",
    targetId: engineId,
    metadata: {
      model: brief.model,
      systemPromptVersion: brief.systemPromptVersion.versionLabel,
      brainUsed: brief.metadata.brainUsed,
      brainSections: brief.metadata.brainSections,
      workspaceId: body.workspaceId ?? null,
      ownerUserId: ownerUserId ?? null,
    },
    requestId: auth.requestId,
  });

  return NextResponse.json({
    ok: true,
    brief,
    providerMessages: brief.providerMessages,
    estimatedCredits: brief.estimatedCredits,
    warnings: brief.metadata.warnings,
    conflicts: brief.metadata.conflicts,
    configHealth,
    brain: {
      loaded: ctx.brainLoad?.loaded ?? false,
      isolationOk: ctx.brainLoad?.isolationOk ?? true,
      sections: brief.metadata.brainSections,
      error: ctx.brainLoad?.error,
      workspaceId: ctx.brainLoad?.workspaceId,
      ownerUserId: ctx.brainLoad?.ownerUserId,
    },
    promptCompilerV2: ctx.promptCompilerV2,
    productionPipeline: ctx.tool.productionPipeline,
  });
}
