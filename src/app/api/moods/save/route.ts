import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";
import { requireMoodUser, MOOD_HEADERS } from "@/lib/moods/server";
import { MOOD_ID } from "@/lib/moods/model";

export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const auth = await requireMoodUser(req);
  if (!auth.ok) return auth.response;
  const parsed = await readJsonBody(req, REQUEST_LIMITS.jsonDefault);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as { moodId?: unknown; saved?: unknown } | null;
  if (!body || typeof body.moodId !== "string" || !MOOD_ID.test(body.moodId) || typeof body.saved !== "boolean") return NextResponse.json({ error: "bad-input" }, { status: 400, headers: MOOD_HEADERS });
  const db = getSupabaseAdmin();
  if (body.saved) {
    const mood = await db.from("maro_moods").select("id").eq("id", body.moodId).eq("active", true).maybeSingle();
    if (mood.error) return NextResponse.json({ error: "save-failed" }, { status: 503, headers: MOOD_HEADERS });
    if (!mood.data) return NextResponse.json({ error: "mood_unavailable" }, { status: 404, headers: MOOD_HEADERS });
  }
  const result = body.saved
    ? await db.from("maro_mood_saves").upsert({ user_id: auth.user.id, mood_id: body.moodId }, { onConflict: "user_id,mood_id" })
    : await db.from("maro_mood_saves").delete().eq("user_id", auth.user.id).eq("mood_id", body.moodId);
  return NextResponse.json(result.error ? { error: "save-failed" } : { saved: body.saved }, { status: result.error ? 503 : 200, headers: MOOD_HEADERS });
}
