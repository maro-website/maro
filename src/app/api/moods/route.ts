import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireMoodUser, MOOD_HEADERS } from "@/lib/moods/server";

export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const auth = await requireMoodUser(req);
  if (!auth.ok) return auth.response;
  const db = getSupabaseAdmin();
  const [moods, saves] = await Promise.all([
    db.from("maro_moods").select("id,title,description,cover_url,sort_order").eq("active", true).order("sort_order").order("created_at").order("id"),
    db.from("maro_mood_saves").select("mood_id").eq("user_id", auth.user.id),
  ]);
  if (moods.error || saves.error) return NextResponse.json({ error: "moods_unavailable" }, { status: 503, headers: MOOD_HEADERS });
  const saved = new Set(saves.data?.map(row => row.mood_id));
  return NextResponse.json({ items: (moods.data ?? []).map(row => ({ ...row, saved: saved.has(row.id) })) }, { headers: MOOD_HEADERS });
}
