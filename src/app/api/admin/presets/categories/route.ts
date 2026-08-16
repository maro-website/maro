import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { writeAuditEvent } from "@/lib/admin/audit";
import { listPresetCategories, upsertPresetCategory, ensurePresetCategoriesSeeded } from "@/lib/presets/categories";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const auth = await requirePermission(req, "presets.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const categories = await listPresetCategories(true);
  if (categories.length === 0) {
    await ensurePresetCategoriesSeeded();
  }
  const refreshed = categories.length === 0 ? await listPresetCategories(true) : categories;
  return NextResponse.json({ categories: refreshed });
}

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const auth = await requirePermission(req, "presets.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { id?: string; slug?: string; label?: string; description?: string; sortOrder?: number; active?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  if (!body.slug?.trim() || !body.label?.trim()) {
    return NextResponse.json({ error: "slug_and_label_required" }, { status: 400 });
  }

  const category = await upsertPresetCategory({
    id: body.id,
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
