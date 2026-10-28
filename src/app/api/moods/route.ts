import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireMoodUser, STYLE_COLUMNS, styleResponse, styleFailure, styleView, StyleError } from "@/lib/moods/server";
import { writeStyle, deleteStyle } from "@/lib/moods/mutations";
import { MOOD_ID } from "@/lib/moods/model";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const auth = await requireMoodUser(req);
    if (!auth.ok) return auth.response;
    const params = new URL(req.url).searchParams;
    const page = Number(params.get("page") ?? 0), scope = params.get("scope") ?? "all", search = (params.get("q") ?? "").trim();
    if (!Number.isSafeInteger(page) || page < 0 || page > 1000 || search.length > 80 || !["all", "platform", "community", "mine", "saved"].includes(scope)) throw new StyleError("invalid_style");
    const db = getSupabaseAdmin();
    const saves = await db.from("maro_mood_saves").select("mood_id").eq("user_id", auth.user.id).limit(2000);
    if (saves.error) throw new StyleError("styles_unavailable", 503);
    const saved = new Set<string>((saves.data ?? []).map(row => row.mood_id));
    if (scope === "saved" && !saved.size) return styleResponse({ items: [], hasMore: false });
    let query = db.from("maro_moods").select(STYLE_COLUMNS);
    const id = params.get("id");
    if (id && !MOOD_ID.test(id)) throw new StyleError("invalid_style");
    if (id) query = query.eq("id", id);
    if (scope === "mine") query = query.eq("created_by", auth.user.id);
    else query = query.eq("active", true).eq("status", "approved").or(`visibility.eq.public,created_by.eq.${auth.user.id}`);
    if (scope === "platform" || scope === "community") query = query.eq("source", scope);
    if (scope === "saved") query = query.in("id", [...saved]);
    if (search) query = query.ilike("title", `%${search.replace(/[\\%_]/g, "\\$&")}%`);
    const moods = await query.order("sort_order").order("created_at", { ascending: false }).order("id").range(page * 60, page * 60 + 60);
    if (moods.error) throw new StyleError("styles_unavailable", 503);
    const items = await Promise.all((moods.data ?? []).slice(0, 60).map(async row => ({ ...await styleView(row, auth.user.id), saved: saved.has(row.id) })));
    return styleResponse({ items, hasMore: (moods.data?.length ?? 0) > 60 });
  } catch (error) { return styleFailure(error); }
}
export const POST = (req: Request) => writeStyle(req, false);
export const PUT = (req: Request) => writeStyle(req, true);
export const DELETE = (req: Request) => deleteStyle(req);
