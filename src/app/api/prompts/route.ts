import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  getUserFromToken,
  supabaseServerConfigured,
} from "@/lib/supabase/server";
import type { PromptItem } from "@/lib/prompts/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  return h.startsWith("Bearer ") ? h.slice(7) : h;
}

// Public catalog of curated prompts. Returns metadata only (no full_prompt).
// If the request is authenticated, also returns the user's liked + owned ids.
export async function GET(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ items: [], liked: [], owned: [] });
  }
  const admin = getSupabaseAdmin();

  let items: PromptItem[] = [];
  try {
    const { data } = await admin
      .from("maro_prompts")
      .select(
        "id, code, category, featured_url, keywords, target_tool, reveal_count, use_count, created_at"
      )
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(500);
    items = (data ?? []) as PromptItem[];
  } catch {
    return NextResponse.json({ items: [], liked: [], owned: [] });
  }

  let liked: string[] = [];
  let owned: string[] = [];
  const user = await getUserFromToken(bearer(req));
  if (user) {
    try {
      const [{ data: likes }, { data: reveals }] = await Promise.all([
        admin.from("prompt_likes").select("prompt_id").eq("user_id", user.id),
        admin.from("prompt_reveals").select("prompt_id").eq("user_id", user.id),
      ]);
      liked = (likes ?? []).map((r) => r.prompt_id as string);
      owned = (reveals ?? []).map((r) => r.prompt_id as string);
    } catch {
      /* ignore — anonymous view */
    }
  }

  return NextResponse.json({ items, liked, owned });
}
