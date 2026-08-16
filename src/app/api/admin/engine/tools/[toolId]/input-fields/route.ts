import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import { validateToolConfiguration } from "@/lib/engine/configHealth";
import { resolveToolInputFields, validateFieldRecord } from "@/lib/engine/inputFields";
import { isEngineToolId } from "@/lib/engine/toolRegistry";
import { getEngineToolDetail } from "@/lib/engine/storage";
import { getSupabaseAdmin, supabaseServerConfigured } from "@/lib/supabase/server";
import type { EngineToolId, ToolInputFieldRecord } from "@/lib/engine/types";

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

  const detail = await getEngineToolDetail(toolId as EngineToolId);
  if (!detail) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const resolved = resolveToolInputFields(
    toolId as EngineToolId,
    detail.fields,
    detail.fortConfig as never
  );

  return NextResponse.json({
    dbFields: detail.fields,
    resolved,
    precedence: "DB explicit override > code schema fallback (src/lib/fort/schema.ts)",
  });
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

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  if (body.action === "reorder" && Array.isArray(body.order)) {
    const order = body.order as Array<{ fieldKey: string; sortOrder: number }>;
    for (const item of order) {
      await getSupabaseAdmin()
        .from("tool_input_fields")
        .update({ sort_order: item.sortOrder, updated_at: new Date().toISOString() })
        .eq("tool_id", toolId)
        .eq("field_key", item.fieldKey);
    }
    await writeAuditEvent({
      actorId: auth.admin.userId,
      action: "engine.input_fields.reorder",
      targetType: "tool_input_fields",
      targetId: toolId,
      requestId: auth.requestId,
    });
    return NextResponse.json({ ok: true });
  }

  const fieldKey = String(body.fieldKey ?? body.field_key ?? "").trim();
  if (!fieldKey) return NextResponse.json({ error: "field_key_required" }, { status: 400 });

  const candidate: Partial<ToolInputFieldRecord> = {
    fieldKey,
    label: String(body.label ?? fieldKey),
    description: String(body.description ?? ""),
    fieldType: String(body.fieldType ?? body.field_type ?? "text"),
    placeholder: (body.placeholder as string | null) ?? null,
    options: (body.options as ToolInputFieldRecord["options"]) ?? [],
    defaultValue: body.defaultValue ?? body.default_value ?? null,
    required: Boolean(body.required),
    enabled: body.enabled !== false,
    sortOrder: Number(body.sortOrder ?? body.sort_order ?? 0),
    standardVisible: Boolean(body.standardVisible ?? body.standard_visible),
    fortVisible: body.fortVisible !== false && body.fort_visible !== false,
    conditionalVisibility: (body.conditionalVisibility ?? body.conditional_visibility ?? []) as ToolInputFieldRecord["conditionalVisibility"],
    modelCompatibility: (body.modelCompatibility ?? body.model_compatibility ?? []) as string[],
    presetCompatibility: (body.presetCompatibility ?? body.preset_compatibility ?? []) as string[],
    costModifier: (body.costModifier ?? body.cost_modifier ?? {}) as Record<string, unknown>,
    metadata: (body.metadata ?? {}) as Record<string, unknown>,
  };

  const validation = validateFieldRecord(candidate);
  if (!validation.ok) {
    return NextResponse.json({ error: "validation_failed", details: validation.errors }, { status: 400 });
  }

  const row = {
    tool_id: toolId,
    field_key: fieldKey,
    label: candidate.label,
    description: candidate.description,
    field_type: candidate.fieldType,
    placeholder: candidate.placeholder,
    options: candidate.options,
    default_value: candidate.defaultValue,
    required: candidate.required,
    enabled: candidate.enabled,
    sort_order: candidate.sortOrder,
    standard_visible: candidate.standardVisible,
    fort_visible: candidate.fortVisible,
    conditional_visibility: candidate.conditionalVisibility,
    model_compatibility: candidate.modelCompatibility,
    preset_compatibility: candidate.presetCompatibility,
    cost_modifier: candidate.costModifier,
    metadata: candidate.metadata,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await getSupabaseAdmin()
    .from("tool_input_fields")
    .upsert(row, { onConflict: "tool_id,field_key" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditEvent({
    actorId: auth.admin.userId,
    action: "engine.input_field.upsert",
    targetType: "tool_input_field",
    targetId: `${toolId}:${fieldKey}`,
    after: row as unknown as Record<string, unknown>,
    requestId: auth.requestId,
  });

  const detail = await getEngineToolDetail(toolId as EngineToolId);
  const resolved = detail
    ? resolveToolInputFields(toolId as EngineToolId, detail.fields, detail.fortConfig as never)
    : [];

  return NextResponse.json({ field: data, resolved });
}
