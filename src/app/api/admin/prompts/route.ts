import { NextResponse } from "next/server";
import {
  getProfileCredits,
  getSupabaseAdmin,
  getUserFromToken,
  supabaseServerConfigured,
} from "@/lib/supabase/server";
import type { AdminPromptItem, PromptAnalytics } from "@/lib/prompts/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  return h.startsWith("Bearer ") ? h.slice(7) : h;
}

async function requireAdmin(req: Request): Promise<string | null> {
  const user = await getUserFromToken(bearer(req));
  if (!user) return null;
  const profile = await getProfileCredits(user.id);
  if (!profile?.is_admin) return null;
  return user.id;
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
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("maro_prompts")
    .select(
      "id, code, category, featured_url, full_prompt, keywords, target_tool, active, reveal_count, use_count, created_at"
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
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  const record = {
    code: genCode(),
    category: String(body.category ?? "").trim(),
    featured_url: body.featured_url ? String(body.featured_url) : null,
    full_prompt: String(body.full_prompt ?? "").trim(),
    keywords: cleanKeywords(body.keywords),
    target_tool: String(body.target_tool ?? "logo"),
    active: body.active === false ? false : true,
  };
  if (!record.category || !record.full_prompt) {
    return NextResponse.json({ error: "missing-fields" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  // Retry once on the (astronomically unlikely) code collision.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await admin.from("maro_prompts").insert(record).select().single();
    if (!error) return NextResponse.json({ item: data });
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
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "bad-request" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body.category !== undefined) patch.category = String(body.category).trim();
  if (body.featured_url !== undefined) patch.featured_url = body.featured_url ? String(body.featured_url) : null;
  if (body.full_prompt !== undefined) patch.full_prompt = String(body.full_prompt).trim();
  if (body.keywords !== undefined) patch.keywords = cleanKeywords(body.keywords);
  if (body.target_tool !== undefined) patch.target_tool = String(body.target_tool);
  if (body.active !== undefined) patch.active = Boolean(body.active);

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("maro_prompts")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: "update-failed" }, { status: 500 });
  return NextResponse.json({ item: data });
}

// Delete a prompt.
export async function DELETE(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

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
  return NextResponse.json({ ok: true });
}
