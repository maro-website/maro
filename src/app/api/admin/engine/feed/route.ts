import { requirePermission } from "@/lib/admin/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { readJsonBody } from "@/lib/security/requestLimits";
import { configSchema } from "@/lib/feed/model";
import { feedError, feedResponse, loadFeedConfig } from "@/lib/feed/server";
import { writeAuditEvent } from "@/lib/admin/audit";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const auth = await requirePermission(req, "engine.view"); if (!auth.ok) return feedResponse({ error: auth.error }, auth.status);
    const settings = await loadFeedConfig();
    const { data, error } = await getSupabaseAdmin().from("maro_feeds").select("id,category,brief,free_used,refunded,created_at,content_type,text_mode,references_list,cancelled_at,refund_credits").order("created_at", { ascending: false }).limit(30);
    if (error) throw new Error("unavailable");
    return feedResponse({ ...settings, feeds: (data ?? []).map(f => ({ id: f.id, brand: f.brief.brand, category: f.category, freeUsed: f.free_used, refunded: f.refunded, createdAt: f.created_at, contentType: f.content_type, textMode: f.text_mode, referenceCount: f.references_list?.length || 1, cancelled: Boolean(f.cancelled_at), refundCredits: f.refund_credits })) });
  } catch (error) { return feedError(error); }
}
export async function PUT(req: Request) {
  try {
    const auth = await requirePermission(req, "engine.publish"); if (!auth.ok) return feedResponse({ error: auth.error }, auth.status);
    const body = await readJsonBody(req, 40000); if (!body.ok) return body.response;
    const raw = body.body as { config?: unknown; revision?: unknown };
    const parsed = configSchema.safeParse(raw?.config);
    if (!parsed.success || !Number.isInteger(raw?.revision) || Number(raw.revision) < 0) return feedResponse({ error: "invalid_request" }, 400);
    const db = getSupabaseAdmin();
    const mutation = raw.revision === 0
      ? await db.from("maro_feed_config").insert({ id: 1, config: parsed.data, revision: 1, updated_by: auth.admin.userId }).select("revision").single()
      : await db.from("maro_feed_config").update({ config: parsed.data, revision: Number(raw.revision) + 1, updated_at: new Date().toISOString(), updated_by: auth.admin.userId }).eq("id", 1).eq("revision", raw.revision).select("revision").maybeSingle();
    if (mutation.error || !mutation.data) return feedResponse({ error: "config_conflict" }, 409);
    await writeAuditEvent({ actorId: auth.admin.userId, action: "feed.config.update", targetType: "maro_feed_config", targetId: "1", requestId: auth.requestId,
      after: { revision: mutation.data.revision, enabled: parsed.data.enabled, model: parsed.data.model } });
    return feedResponse({ config: parsed.data, revision: mutation.data.revision });
  } catch (error) { return feedError(error); }
}
