import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";
import { writeAuditEvent } from "@/lib/admin/audit";
import { requireMoodAdmin, STYLE_COLUMNS, styleResponse, styleFailure, styleView, StyleError } from "@/lib/moods/server";
import { writeStyle, deleteStyle } from "@/lib/moods/mutations";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const auth = await requireMoodAdmin(req);
    if (!auth.ok) return auth.response;
    const params = new URL(req.url).searchParams, status = params.get("status") ?? "pending", page = Number(params.get("page") ?? 0);
    if (!["all", "pending", "approved", "rejected", "failed", "processing"].includes(status) || !Number.isSafeInteger(page) || page < 0 || page > 1000) throw new StyleError("invalid_style");
    let query = getSupabaseAdmin().from("maro_moods").select(`${STYLE_COLUMNS},prompt`);
    if (status !== "all") query = query.eq("status", status);
    const result = await query.order("updated_at", { ascending: false }).order("id").range(page * 60, page * 60 + 60);
    if (result.error) throw new StyleError("styles_unavailable", 503);
    return styleResponse({ items: await Promise.all((result.data ?? []).slice(0, 60).map(async row => ({
      ...await styleView(row, auth.user.id, true),
      // Edits retain the old compiled value while processing or failed. Never pair it with the new brief.
      generated_prompt: ["pending", "approved", "rejected"].includes(row.status) && typeof row.prompt === "string" && row.prompt.trim() ? row.prompt : null,
    }))), hasMore: (result.data?.length ?? 0) > 60 });
  } catch (error) { return styleFailure(error); }
}
export const POST = (req: Request) => writeStyle(req, false, true);
export const PUT = (req: Request) => writeStyle(req, true, true);
export const DELETE = (req: Request) => deleteStyle(req, true);
export async function PATCH(req: Request) {
  try {
    const auth = await requireMoodAdmin(req);
    if (!auth.ok) return auth.response;
    const parsed = await readJsonBody(req, REQUEST_LIMITS.jsonDefault);
    if (!parsed.ok) return parsed.response;
    const body = z.object({ id: z.uuid(), updated_at: z.iso.datetime({ offset: true }), decision: z.enum(["approved", "rejected"]), reason: z.string().trim().max(500).optional() }).strict().safeParse(parsed.body);
    if (!body.success || (body.data.decision === "rejected" && !body.data.reason)) throw new StyleError("invalid_style_review");
    const { id, updated_at, decision, reason } = body.data;
    const now = new Date().toISOString();
    const result = await getSupabaseAdmin().from("maro_moods").update({ status: decision, active: decision === "approved", rejection_reason: decision === "rejected" ? reason : null,
      reviewed_by: auth.user.id, reviewed_at: now, updated_at: now }).eq("id", id).eq("updated_at", updated_at)
      .in("status", ["pending", "approved", "rejected"]).select(STYLE_COLUMNS).maybeSingle();
    if (result.error) throw new StyleError("styles_unavailable", 503);
    if (!result.data) throw new StyleError("mood_changed", 409);
    await writeAuditEvent({ actorId: auth.user.id, action: `styles.${decision}`, targetType: "maro_moods", targetId: id, requestId: auth.requestId });
    return styleResponse({ item: await styleView(result.data, auth.user.id, true) });
  } catch (error) { return styleFailure(error); }
}
