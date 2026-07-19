import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  getUserFromToken,
  supabaseServerConfigured,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  return h.startsWith("Bearer ") ? h.slice(7) : h;
}

// Return the signed-in user's image generations (server source of truth). This
// heals the case where a client navigated away mid-generation: the image was
// charged + stored server-side, so it reappears when the user returns.
export async function GET(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ items: [] });
  const user = await getUserFromToken(bearer(req));
  if (!user) return NextResponse.json({ items: [] });

  // Try the full select (with favourite/title); fall back if the columns don't
  // exist yet (before migration 0007).
  const admin = getSupabaseAdmin();
  const map = (data: Record<string, unknown>[]) =>
    data
      .filter((r) => Array.isArray(r.output_urls) && (r.output_urls as unknown[]).length > 0)
      .map((r) => ({
        id: r.id as string,
        toolId: (r.tool_id as string) ?? "logo",
        prompt: (r.prompt as string) ?? "",
        urls: (r.output_urls as string[]) ?? [],
        favourite: Boolean(r.favourite),
        title: (r.title as string) ?? undefined,
        createdAt: (r.created_at as string) ?? new Date().toISOString(),
      }));

  try {
    const { data, error } = await admin
      .from("generations")
      .select("id, tool_id, prompt, output_urls, favourite, title, created_at")
      .eq("user_id", user.id)
      .eq("kind", "image")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!error) return NextResponse.json({ items: map(data ?? []) });
  } catch {
    /* fall through */
  }

  try {
    const { data } = await admin
      .from("generations")
      .select("id, tool_id, prompt, output_urls, created_at")
      .eq("user_id", user.id)
      .eq("kind", "image")
      .order("created_at", { ascending: false })
      .limit(200);
    return NextResponse.json({ items: map(data ?? []) });
  } catch {
    return NextResponse.json({ items: [] });
  }
}

// Update a creation's favourite flag / title. Keyed by the creation's first
// image URL (the client id is generated locally and may differ from the row id).
export async function PATCH(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ ok: false });
  const user = await getUserFromToken(bearer(req));
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { url?: string; favourite?: boolean; title?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }
  if (!body.url) return NextResponse.json({ error: "bad-url" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (typeof body.favourite === "boolean") patch.favourite = body.favourite;
  if (typeof body.title === "string") patch.title = body.title;
  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true });

  try {
    await getSupabaseAdmin()
      .from("generations")
      .update(patch)
      .eq("user_id", user.id)
      .contains("output_urls", [body.url]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}

// Delete a creation server-side (keyed by first image URL).
export async function DELETE(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ ok: false });
  const user = await getUserFromToken(bearer(req));
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { url?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }
  if (!body.url) return NextResponse.json({ error: "bad-url" }, { status: 400 });

  try {
    await getSupabaseAdmin()
      .from("generations")
      .delete()
      .eq("user_id", user.id)
      .contains("output_urls", [body.url]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
