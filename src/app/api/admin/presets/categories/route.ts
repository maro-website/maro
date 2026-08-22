import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import { listPresetCategories, upsertPresetCategory, ensurePresetCategoriesSeeded } from "@/lib/presets/categories";
import { supabaseServerConfigured } from "@/lib/supabase/server";
import { isPresetTool } from "@/lib/presets/model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const auth = await requirePermission(req, "presets.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const requestedTool = url.searchParams.get("tool");
  const tool = isPresetTool(requestedTool) ? requestedTool : undefined;
  const categories = await listPresetCategories(true, tool);
  if (categories.length === 0) {
    await ensurePresetCategoriesSeeded(tool ?? "imazh");
  }
  const refreshed = categories.length === 0 ? await listPresetCategories(true, tool) : categories;
  return NextResponse.json({ categories: refreshed });
}

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const auth = await requirePermission(req, "presets.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { id?: string; tool?: string; slug?: string; label?: string; description?: string; sortOrder?: number; active?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  if (!isPresetTool(body.tool) || !body.slug?.trim() || !body.label?.trim()) {
    return NextResponse.json({ error: "slug_and_label_required" }, { status: 400 });
  }

  const category = await upsertPresetCategory({
    id: body.id,
    tool: body.tool,
    slug: body.slug,
    label: body.label,
    description: body.description,
    sortOrder: body.sortOrder,
    active: body.active,
  });

  await writeAuditEvent({
    actorId: auth.admin.userId,
    action: body.id ? "presets.category.update" : "presets.category.create",
    targetType: "preset_categories",
    targetId: category.id as string,
    requestId: auth.requestId,
  });

  return NextResponse.json({ category });
}
