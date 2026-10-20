import { feedUser, ownedFeed, feedError, feedResponse } from "@/lib/feed/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { imageZip } from "@/lib/feed/zip";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const user = await feedUser(req); const url = new URL(req.url);
    const id = url.searchParams.get("feedId") ?? ""; const raw = url.searchParams.get("slot");
    if (!/^[\da-f-]{36}$/i.test(id) || (raw !== null && !/^[0-8]$/.test(raw))) return feedResponse({ error: "invalid_request" }, 400);
    const feed = await ownedFeed(user.id, id);
    const db = getSupabaseAdmin();
    const { data, error } = await db.from("maro_feed_attempts").select("slot,job_id").eq("feed_id", id).eq("owner_id", user.id).eq("status", "completed").order("created_at", { ascending: false }).limit(500);
    if (error) throw new Error("download_unavailable");
    const slots = raw === null ? (feed.cancelled_at ? [...new Set((data ?? []).map(row => Number(row.slot)))].sort((a, b) => a - b) : Array.from({ length: 9 }, (_, i) => i)) : [Number(raw)];
    if (!slots.length) return feedResponse({ error: "feed_not_complete" }, 409);
    const files: Array<{ name: string; bytes: Uint8Array }> = [];
    let total = 0;
    for (const slot of slots) {
      const a = data?.find(row => row.slot === slot); if (!a) return feedResponse({ error: "feed_not_complete" }, 409);
      const downloaded = await db.storage.from("generations").download(`${user.id}/${a.job_id}/output.png`);
      if (downloaded.error || !downloaded.data) throw new Error("download_unavailable");
      total += downloaded.data.size; if (total > 150 * 1024 * 1024) throw new Error("download_too_large");
      files.push({ name: `maroFeed-${String(slot + 1).padStart(2, "0")}.png`, bytes: new Uint8Array(await downloaded.data.arrayBuffer()) });
    }
    return new Response(raw === null ? imageZip(files) as BodyInit : files[0].bytes as BodyInit, { headers: {
      "Content-Type": raw === null ? "application/zip" : "image/png", "Cache-Control": "no-store", Vary: "Authorization",
      "Content-Disposition": `attachment; filename="${raw === null ? `maroFeed-${files.length}-posts.zip` : files[0].name}"`, "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) { return feedError(error); }
}
