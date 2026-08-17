import "server-only";

import type { AiGenerateRequest } from "@/lib/ai/types";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { compileGenerationBrief } from "./compiler";
import { buildStructuralDiff, snapshotFromEngineBrief } from "./shadowDiff";
import { buildWebStructuralDiff } from "./shadowWebDiff";
import { loadCompileContext } from "./storage";
import { resolveEngineToolId } from "./toolRegistry";
import type {
  CompileGenerationBriefInput,
  EngineToolId,
  ShadowComparisonSnapshot,
  ShadowContextMetadata,
  ShadowReviewStatus,
  ShadowStructuralDiff,
} from "./types";

export interface ShadowCompileInput {
  toolId: string;
  registryToolId: string;
  model: string;
  userId?: string;
  workspaceId?: string;
  userPrompt: string;
  selections?: Record<string, string>;
  fort?: { enabled: boolean; values: Record<string, unknown> };
  attachments?: Array<{ type: string; name?: string; url?: string }>;
  presetId?: string;
  presetPrompt?: string;
  useBrain?: boolean;
  legacySnapshot: ShadowComparisonSnapshot;
  generationId?: string;
  jobId?: string;
  websiteType?: string;
  speed?: string;
  webRequest?: import("@/lib/ai/types").AiGenerateRequest;
  /** Instrumentation from production route — must stay 1. */
  providerRequestCount?: number;
}

export interface ShadowCompileResult {
  ok: boolean;
  comparisonId?: string;
  engineSnapshot?: ShadowComparisonSnapshot;
  structuralDiff?: ShadowStructuralDiff;
  compileError?: string;
  hasCriticalMismatch?: boolean;
}

export interface ShadowComparisonFilters {
  toolId?: string;
  generationId?: string;
  modelId?: string;
  dateFrom?: string;
  dateTo?: string;
  fortEnabled?: boolean;
  brainUsed?: boolean;
  compileStatus?: "success" | "failed";
  criticalMismatch?: boolean;
  reviewStatus?: ShadowReviewStatus;
  limit?: number;
}

function buildContextMetadata(input: {
  shadowInput: ShadowCompileInput;
  legacy: ShadowComparisonSnapshot;
  engine: ShadowComparisonSnapshot;
  compileError?: string;
}): ShadowContextMetadata {
  return {
    generationId: input.shadowInput.generationId,
    jobId: input.shadowInput.jobId,
    userId: input.shadowInput.userId,
    workspaceId: input.shadowInput.workspaceId,
    modelId: input.shadowInput.model,
    userPrompt: input.shadowInput.userPrompt,
    websiteType: input.shadowInput.websiteType ?? input.legacy.websiteType,
    speed: input.shadowInput.speed ?? input.legacy.speed,
    selections: input.shadowInput.selections ?? input.legacy.selections,
    fortEnabled: input.shadowInput.fort?.enabled ?? input.legacy.fortEnabled,
    fortValues: input.shadowInput.fort?.values ?? input.legacy.fortValues,
    legacyBrainSections: input.legacy.brainSections,
    engineBrainSections: input.engine.brainSections,
    legacySystemMessage: input.legacy.systemInstructions,
    legacyUserMessage: input.legacy.userContent,
    engineSystemInstructions: input.engine.systemInstructions,
    engineUserContent: input.engine.userContent,
    appliedLayerNames: input.engine.appliedLayers?.map((l) => l.name),
    systemPromptVersion: input.engine.systemPromptVersion,
    estimatedCredits: input.engine.estimatedCredits ?? input.legacy.estimatedCredits,
    compileStatus: input.compileError ? "failed" : "success",
    compileError: input.compileError,
    timestamp: new Date().toISOString(),
    providerRequestCount: input.shadowInput.providerRequestCount ?? 1,
    engineProviderRequestCount: 0,
  };
}

function enrichEngineSnapshot(
  brief: ReturnType<typeof compileGenerationBrief>,
  snapshot: ShadowComparisonSnapshot
): ShadowComparisonSnapshot {
  return {
    ...snapshot,
    websiteType: brief.metadata.selections?.type,
    outputRequirements: brief.outputRequirements,
    restrictions: brief.restrictions,
    attachmentsMeta: brief.providerMessages?.attachments,
    selections: brief.metadata.selections,
  };
}

/**
 * Shadow compilation — NEVER throws. Failures are logged internally.
 * Does NOT affect legacy provider request or user output.
 */
export async function runShadowCompilation(input: ShadowCompileInput): Promise<ShadowCompileResult> {
  try {
    const engineId = resolveEngineToolId(input.toolId);
    if (!engineId) {
      return { ok: false, compileError: "unknown_tool" };
    }

    const compileInput: CompileGenerationBriefInput = {
      toolId: engineId,
      userId: input.userId,
      workspaceId: input.workspaceId,
      model: input.model,
      userPrompt: input.userPrompt,
      selections: input.selections,
      fort: input.fort,
      attachments: input.attachments,
      presetId: input.presetId,
      presetPrompt: input.presetPrompt,
      useBrain: input.useBrain,
      webRequest: input.webRequest ?? (engineId === "maro_web"
        ? ({
            businessName: "Business",
            category: "generic",
            language: "sq",
            goal: input.userPrompt,
            websiteType: input.websiteType as AiGenerateRequest["websiteType"],
            speed: input.speed as AiGenerateRequest["speed"],
          } satisfies Partial<AiGenerateRequest>)
        : undefined),
    };

    const ctx = await loadCompileContext(engineId, {
      ownerUserId: input.userId,
      workspaceId: input.workspaceId,
    });

    const brief = compileGenerationBrief(compileInput, ctx);
    let engineSnapshot = enrichEngineSnapshot(brief, snapshotFromEngineBrief(brief));

    const structuralDiff =
      engineId === "maro_web"
        ? buildWebStructuralDiff(input.legacySnapshot, engineSnapshot, {
            fortEnabled: input.fort?.enabled,
            websiteType: input.websiteType ?? input.legacySnapshot.websiteType,
          })
        : buildStructuralDiff(input.legacySnapshot, engineSnapshot);

    const hasCritical =
      "hasCriticalMismatch" in structuralDiff && Boolean(structuralDiff.hasCriticalMismatch);

    const comparisonId = await storeShadowComparison({
      generationId: input.generationId,
      jobId: input.jobId,
      toolId: engineId,
      registryToolId: input.registryToolId,
      modelId: input.model,
      userId: input.userId,
      workspaceId: input.workspaceId,
      legacySnapshot: input.legacySnapshot,
      engineSnapshot,
      structuralDiff,
      compileError: undefined,
      contextMetadata: buildContextMetadata({
        shadowInput: input,
        legacy: input.legacySnapshot,
        engine: engineSnapshot,
      }),
      criticalMismatch: hasCritical,
      compileStatus: "success",
    });

    return {
      ok: true,
      comparisonId,
      engineSnapshot,
      structuralDiff,
      hasCriticalMismatch: hasCritical,
    };
  } catch (err) {
    const message = (err as Error)?.message ?? "shadow_compile_failed";
    try {
      await storeShadowComparison({
        generationId: input.generationId,
        jobId: input.jobId,
        toolId: (resolveEngineToolId(input.toolId) ?? input.toolId) as EngineToolId,
        registryToolId: input.registryToolId,
        modelId: input.model,
        userId: input.userId,
        workspaceId: input.workspaceId,
        legacySnapshot: input.legacySnapshot,
        engineSnapshot: {},
        structuralDiff: { sections: [], warnings: [message] },
        compileError: message,
        contextMetadata: buildContextMetadata({
          shadowInput: input,
          legacy: input.legacySnapshot,
          engine: {},
          compileError: message,
        }),
        criticalMismatch: true,
        compileStatus: "failed",
      });
    } catch {
      console.error("[shadow] failed to store error record:", message);
    }
    return { ok: false, compileError: message, hasCriticalMismatch: true };
  }
}

async function storeShadowComparison(row: {
  generationId?: string;
  jobId?: string;
  toolId: EngineToolId | string;
  registryToolId: string;
  modelId: string;
  userId?: string;
  workspaceId?: string;
  legacySnapshot: ShadowComparisonSnapshot;
  engineSnapshot: ShadowComparisonSnapshot;
  structuralDiff: ShadowStructuralDiff & { criticalFlags?: string[]; hasCriticalMismatch?: boolean };
  compileError?: string;
  contextMetadata: ShadowContextMetadata;
  criticalMismatch: boolean;
  compileStatus: "success" | "failed";
}): Promise<string | undefined> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("engine_shadow_comparisons")
      .insert({
        generation_id: row.generationId ?? null,
        job_id: row.jobId ?? null,
        tool_id: row.toolId,
        registry_tool_id: row.registryToolId,
        model_id: row.modelId,
        user_id: row.userId ?? null,
        workspace_id: row.workspaceId ?? null,
        legacy_snapshot: row.legacySnapshot,
        engine_snapshot: row.engineSnapshot,
        structural_diff: row.structuralDiff,
        warnings: row.structuralDiff.warnings,
        compile_error: row.compileError ?? null,
        context_metadata: row.contextMetadata,
        critical_mismatch: row.criticalMismatch,
        critical_flags: row.structuralDiff.criticalFlags ?? [],
        compile_status: row.compileStatus,
        review_status: "unreviewed",
      })
      .select("id")
      .single();
    if (error) {
      console.error("[shadow] store failed:", error.message);
      return undefined;
    }
    return data?.id as string;
  } catch (e) {
    console.error("[shadow] store exception:", e);
    return undefined;
  }
}

export async function getShadowComparison(id: string) {
  const { data } = await getSupabaseAdmin()
    .from("engine_shadow_comparisons")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function listShadowComparisons(filters: ShadowComparisonFilters) {
  let q = getSupabaseAdmin()
    .from("engine_shadow_comparisons")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 50);

  if (filters.toolId) q = q.eq("tool_id", filters.toolId);
  if (filters.generationId) q = q.eq("generation_id", filters.generationId);
  if (filters.modelId) q = q.eq("model_id", filters.modelId);
  if (filters.dateFrom) q = q.gte("created_at", filters.dateFrom);
  if (filters.dateTo) q = q.lte("created_at", filters.dateTo);
  if (filters.compileStatus) q = q.eq("compile_status", filters.compileStatus);
  if (filters.criticalMismatch != null) q = q.eq("critical_mismatch", filters.criticalMismatch);
  if (filters.reviewStatus) q = q.eq("review_status", filters.reviewStatus);

  const { data } = await q;
  let rows = data ?? [];

  if (filters.fortEnabled != null) {
    rows = rows.filter((r) => {
      const meta = r.context_metadata as ShadowContextMetadata | null;
      return Boolean(meta?.fortEnabled) === filters.fortEnabled;
    });
  }

  if (filters.brainUsed != null) {
    rows = rows.filter((r) => {
      const legacy = r.legacy_snapshot as ShadowComparisonSnapshot;
      const engine = r.engine_snapshot as ShadowComparisonSnapshot;
      const used = Boolean(legacy.brainSections?.length || engine.brainSections?.length);
      return used === filters.brainUsed;
    });
  }

  return rows;
}

export async function summarizeShadowComparisons(toolId: string) {
  const rows = await listShadowComparisons({ toolId, limit: 500 });
  const total = rows.length;
  const successful = rows.filter((r) => r.compile_status === "success").length;
  const failed = rows.filter((r) => r.compile_status === "failed").length;
  const critical = rows.filter((r) => r.critical_mismatch).length;
  const latest = rows[0] ?? null;

  return {
    toolId,
    total,
    successful,
    failed,
    critical,
    compileSuccessRate: total ? Math.round((successful / total) * 100) : null,
    criticalMismatchRate: total ? Math.round((critical / total) * 100) : null,
    latestComparisonAt: latest?.created_at ?? null,
    latestCriticalMismatch: latest?.critical_mismatch ?? false,
    legacyGenerationSuccessUnaffected: true,
  };
}

export async function updateShadowReview(input: {
  id: string;
  reviewStatus: ShadowReviewStatus;
  reviewNote?: string;
}) {
  const { data, error } = await getSupabaseAdmin()
    .from("engine_shadow_comparisons")
    .update({
      review_status: input.reviewStatus,
      review_note: input.reviewNote ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** @deprecated Use scheduleShadowCompilationReliable from shadowSchedule.ts in production routes. */
export function scheduleShadowCompilation(input: ShadowCompileInput): void {
  void runShadowCompilation(input).catch((e) => {
    console.error("[shadow] unhandled:", e);
  });
}
