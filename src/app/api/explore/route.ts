import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  getUserFromToken,
  supabaseServerConfigured,
} from "@/lib/supabase/server";
import { getTool } from "@/lib/tools/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  return h.startsWith("Bearer ") ? h.slice(7) : h;
}

// Public feed of shared image generations.
export async function GET() {
  if (!supabaseServerConfigured()) return NextResponse.json({ items: [] });
  const admin = getSupabaseAdmin();
  try {
    const { data, error } = await admin
      .from("public_creations")
      .select("id, tool_id, prompt, url, author, author_avatar, created_at")
      .order("created_at", { ascending: false })
      .limit(90);
    if (!error) return NextResponse.json({ items: data ?? [] });
  } catch {
    /* fall through (author_avatar column may be missing) */
  }
  try {
    const { data } = await admin
      .from("public_creations")
      .select("id, tool_id, prompt, url, author, created_at")
      .order("created_at", { ascending: false })
      .limit(90);
    return NextResponse.json({ items: data ?? [] });
  } catch {
    return NextResponse.json({ items: [] });
  }
}

// Publish a generation to the public feed (auth required).
export async function POST(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const user = await getUserFromToken(bearer(req));
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { toolId?: string; prompt?: string; url?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  const tool = getTool(body.toolId ?? "");
  if (!tool) return NextResponse.json({ error: "bad-tool" }, { status: 400 });
  if (!body.url || body.url.startsWith("data:")) {
    return NextResponse.json({ error: "bad-url" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();
  const author =
    (profile?.full_name as string) ||
    (profile?.email as string | undefined)?.split("@")[0] ||
    "Anonim";
  const authorAvatar =
    (user.user_metadata?.avatar_url as string | undefined) || null;

  const base = {
    user_id: user.id,
    tool_id: tool.id,
    prompt: (body.prompt ?? "").slice(0, 2000),
    url: body.url,
    author,
  };

  try {
    // Try with author_avatar; fall back if the column doesn't exist yet.
    const { error } = await admin
      .from("public_creations")
      .insert({ ...base, author_avatar: authorAvatar });
    if (!error) return NextResponse.json({ ok: true });
    const { error: e2 } = await admin.from("public_creations").insert(base);
    if (e2) return NextResponse.json({ error: "insert-failed" }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "insert-failed" }, { status: 500 });
  }
}
