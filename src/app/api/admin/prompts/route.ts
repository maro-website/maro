import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  supabaseServerConfigured,
} from "@/lib/supabase/server";
import { requirePermission } from "@/lib/admin/auth";
import type { AdminPromptItem, PromptAnalytics } from "@/lib/prompts/types";
import { isPresetTool, PRESET_TOOL_META, sanitizePresetConfig, type PresetTool } from "@/lib/presets/model";
import { writeAuditEvent } from "@/lib/admin/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requirePromptsAdmin(req: Request) {
  return requirePermission(req, "presets.manage");
}

function genCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `MP-${s}`;
}

function cleanKeywords(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map((k) => String(k).trim()).filter(Boolean).slice(0, 60);
  }
  if (typeof input === "string") {
    return input
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean)
      .slice(0, 60);
  }
  return [];
}

function cleanSlug(value: unknown, fallback: string): string {
  const source = String(value ?? "").trim() || fallback;
  return source.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || fallback.toLowerCase();
}

function searchText(input: { title: string; category: string; description: string; keywords: string[] }): string {
  return [input.title, input.category, input.description, ...input.keywords].join(" ").trim();
}

function buildAnalytics(rows: AdminPromptItem[]): PromptAnalytics {
  const byCatMap = new Map<string, number>();
  for (const r of rows) byCatMap.set(r.category, (byCatMap.get(r.category) ?? 0) + 1);
  return {
    total: rows.length,
    activeCount: rows.filter((r) => r.active).length,
    totalReveals: rows.reduce((a, r) => a + (r.reveal_count ?? 0), 0),
    totalUses: rows.reduce((a, r) => a + (r.use_count ?? 0), 0),
    creditsFromReveals: 0, // filled in below from prompt_reveals
    byCategory: Array.from(byCatMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
    mostUsed: [...rows]
      .sort((a, b) => (b.use_count ?? 0) - (a.use_count ?? 0))
      .slice(0, 5)
      .map((r) => ({ id: r.id, code: r.code, category: r.category, use_count: r.use_count ?? 0 })),
    mostRevealed: [...rows]
      .sort((a, b) => (b.reveal_count ?? 0) - (a.reveal_count ?? 0))
      .slice(0, 5)
      .map((r) => ({
        id: r.id,
        code: r.code,
        category: r.category,
        reveal_count: r.reveal_count ?? 0,
      })),
  };
}

// List all prompts (with full data) + analytics.
export async function GET(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const auth = await requirePromptsAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("maro_prompts")
    .select(
      "id, code, tool, target_tool, title, slug, description, category, featured_url, full_prompt, keywords, config, status, active, featured, sort_order, access_level, reveal_count, use_count, created_at, updated_at"
    )
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as AdminPromptItem[];

  const analytics = buildAnalytics(rows);
  // Sum credits actually earned from reveals.
  try {
    const { data: reveals } = await admin.from("prompt_reveals").select("credits_spent");
    analytics.creditsFromReveals = (reveals ?? []).reduce(
      (a, r) => a + ((r.credits_spent as number) ?? 0),
      0
    );
  } catch {
    /* ignore */
  }

  return NextResponse.json({ items: rows, analytics });
}

// Create a prompt.
export async function POST(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const auth = await requirePromptsAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  const code = genCode();
  if (!isPresetTool(body.tool)) return NextResponse.json({ error: "invalid-tool" }, { status: 400 });
  const tool = body.tool as PresetTool;
  const title = String(body.title ?? "").trim().slice(0, 140);
  const description = String(body.description ?? "").trim().slice(0, 1000);
  const category = String(body.category ?? "").trim().slice(0, 100);
  const keywords = cleanKeywords(body.keywords);
  const admin = getSupabaseAdmin();
  const { data: categoryRow } = await admin.from("preset_categories").select("id")
    .eq("tool", tool).eq("label", category).maybeSingle();
  const status = ["draft", "published", "disabled", "archived"].includes(String(body.status))
    ? String(body.status) : body.active === false ? "disabled" : "published";
  const active = status === "published" && body.active !== false;
  const record = {
    code,
    tool,
    target_tool: PRESET_TOOL_META[tool].targetTool,
    title,
    slug: cleanSlug(body.slug, `${title || code}-${code.slice(-4)}`),
    description,
    config: sanitizePresetConfig(tool, body.config),
    status,
    featured: Boolean(body.featured),
    sort_order: Math.max(0, Number(body.sort_order) || 0),
    access_level: body.access_level === "premium" ? "premium" : "free",
    search_text: searchText({ title, category, description, keywords }),
    category_id: (categoryRow?.id as string | undefined) ?? null,
    category: String(body.category ?? "").trim(),
    featured_url: body.featured_url ? String(body.featured_url) : null,
    full_prompt: String(body.full_prompt ?? "").trim(),
    keywords,
    active,
  };
  if (!record.title || !record.category || !record.full_prompt) {
    return NextResponse.json({ error: "missing-fields" }, { status: 400 });
  }

  // Retry once on the (astronomically unlikely) code collision.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await admin.from("maro_prompts").insert(record).select().single();
    if (!error) {
      await writeAuditEvent({ actorId: auth.admin.userId, action: "presets.create", targetType: "maro_prompts", targetId: data.id as string, requestId: auth.requestId });
      return NextResponse.json({ item: data });
    }
    if (!String(error.message).includes("duplicate")) {
      return NextResponse.json({ error: "insert-failed" }, { status: 500 });
    }
    record.code = genCode();
  }
  return NextResponse.json({ error: "insert-failed" }, { status: 500 });
}

// Update a prompt.
export async function PUT(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const auth = await requirePromptsAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "bad-request" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  const current = await getSupabaseAdmin().from("maro_prompts").select("tool, title, category, description, keywords, code, active, status").eq("id", id).maybeSingle();
  if (!current.data) return NextResponse.json({ error: "not-found" }, { status: 404 });
  const nextTool = body.tool === undefined ? current.data.tool as PresetTool : body.tool;
  if (!isPresetTool(nextTool)) return NextResponse.json({ error: "invalid-tool" }, { status: 400 });
  if (body.tool !== undefined) {
    patch.tool = nextTool;
    patch.target_tool = PRESET_TOOL_META[nextTool].targetTool;
  }
  if (body.title !== undefined) patch.title = String(body.title).trim().slice(0, 140);
  if (body.slug !== undefined) patch.slug = cleanSlug(body.slug, String(current.data.code));
  if (body.description !== undefined) patch.description = String(body.description).trim().slice(0, 1000);
  if (body.category !== undefined) patch.category = String(body.category).trim();
  if (body.featured_url !== undefined) patch.featured_url = body.featured_url ? String(body.featured_url) : null;
  if (body.full_prompt !== undefined) patch.full_prompt = String(body.full_prompt).trim();
  if (body.keywords !== undefined) patch.keywords = cleanKeywords(body.keywords);
  if (body.config !== undefined) patch.config = sanitizePresetConfig(nextTool, body.config);
  if (body.featured !== undefined) patch.featured = Boolean(body.featured);
  if (body.sort_order !== undefined) patch.sort_order = Math.max(0, Number(body.sort_order) || 0);
  if (body.access_level !== undefined) patch.access_level = body.access_level === "premium" ? "premium" : "free";
  if (body.status !== undefined && ["draft", "published", "disabled", "archived"].includes(String(body.status))) {
    patch.status = String(body.status);
    patch.active = body.status === "published";
  } else if (body.active !== undefined) {
    patch.active = Boolean(body.active);
    patch.status = body.active ? "published" : "disabled";
  }
  const nextTitle = String(patch.title ?? current.data.title ?? current.data.code);
  const nextCategory = String(patch.category ?? current.data.category ?? "");
  const nextDescription = String(patch.description ?? current.data.description ?? "");
  const nextKeywords = (patch.keywords ?? current.data.keywords ?? []) as string[];
  if (body.tool !== undefined || body.category !== undefined) {
    const { data: categoryRow } = await getSupabaseAdmin().from("preset_categories").select("id")
      .eq("tool", nextTool).eq("label", nextCategory).maybeSingle();
    patch.category_id = (categoryRow?.id as string | undefined) ?? null;
  }
  patch.search_text = searchText({ title: nextTitle, category: nextCategory, description: nextDescription, keywords: nextKeywords });
  patch.updated_at = new Date().toISOString();

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("maro_prompts")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: "update-failed" }, { status: 500 });
  await writeAuditEvent({ actorId: auth.admin.userId, action: "presets.update", targetType: "maro_prompts", targetId: id, requestId: auth.requestId });
  return NextResponse.json({ item: data });
}

// Delete a prompt.
export async function DELETE(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const auth = await requirePromptsAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { id?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "bad-request" }, { status: 400 });

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("maro_prompts").delete().eq("id", body.id);
  if (error) return NextResponse.json({ error: "delete-failed" }, { status: 500 });
  await writeAuditEvent({ actorId: auth.admin.userId, action: "presets.delete", targetType: "maro_prompts", targetId: body.id, requestId: auth.requestId });
  return NextResponse.json({ ok: true });
}
