import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { isEngineToolId } from "@/lib/engine/toolRegistry";
import { getSupabaseAdmin, supabaseServerConfigured } from "@/lib/supabase/server";

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

  const { data } = await getSupabaseAdmin()
    .from("tool_model_configs")
    .select("*")
    .eq("tool_id", toolId)
    .order("sort_order");

  return NextResponse.json({ models: data ?? [] });
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

  const modelId = String(body.modelId ?? body.model_id);
  const isDefault = Boolean(body.isDefault ?? body.is_default);

  if (isDefault) {
    await getSupabaseAdmin()
      .from("tool_model_configs")
      .update({ is_default: false })
      .eq("tool_id", toolId);
  }

  const row = {
    tool_id: toolId,
    model_id: modelId,
    display_name: String(body.displayName ?? body.display_name ?? modelId),
    provider: String(body.provider ?? "unknown"),
    enabled: body.enabled !== false,
    is_default: isDefault,
    is_fallback: Boolean(body.isFallback ?? body.is_fallback),
    coming_soon: Boolean(body.comingSoon ?? body.coming_soon),
    sort_order: Number(body.sortOrder ?? body.sort_order ?? 0),
    cost_metadata: body.costMetadata ?? body.cost_metadata ?? {},
    metadata: body.metadata ?? {},
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await getSupabaseAdmin()
    .from("tool_model_configs")
    .upsert(row, { onConflict: "tool_id,model_id" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ model: data });
}
