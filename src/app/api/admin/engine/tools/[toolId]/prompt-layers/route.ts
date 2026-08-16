import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import { isEngineToolId } from "@/lib/engine/toolRegistry";
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
  if (!isEngineToolId(toolId)) return NextResponse.json({ error: "unknown_tool" }, { status: 404 });

  const { data } = await getSupabaseAdmin()
    .from("prompt_layers")
    .select("*")
    .eq("tool_id", toolId)
    .order("priority", { ascending: false });

  return NextResponse.json({ layers: data ?? [] });
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

  const row = {
    layer_key: String(body.layerKey ?? body.layer_key ?? crypto.randomUUID()),
    tool_id: toolId as EngineToolId,
    name: String(body.name ?? "Untitled layer"),
    enabled: body.enabled !== false,
    priority: Number(body.priority ?? 0),
    conditions: body.conditions ?? [],
    instructions: String(body.instructions ?? ""),
    version_label: String(body.versionLabel ?? "1"),
    status: String(body.status ?? "draft"),
    updated_by: auth.admin.userId,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await getSupabaseAdmin()
    .from("prompt_layers")
    .upsert(row, { onConflict: "tool_id,layer_key" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditEvent({
    actorId: auth.admin.userId,
    action: "engine.prompt_layer.upsert",
    targetType: "prompt_layer",
    targetId: String(data.id),
    requestId: auth.requestId,
  });

  return NextResponse.json({ layer: data });
}
