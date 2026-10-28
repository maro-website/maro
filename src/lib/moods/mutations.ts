import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { writeAuditEvent } from "@/lib/admin/audit";
import { STYLE_INPUT_LIMIT, STYLE_TITLE_LIMIT } from "./model";
import { requireMoodUser, requireMoodAdmin, STYLE_COLUMNS, styleResponse, styleFailure, styleView, styleCoverPath, StyleError } from "./server";
import { expandStyle } from "./ai";

export const styleDraftSchema = z.object({
  title: z.string().trim().min(1).max(STYLE_TITLE_LIMIT),
  input_text: z.string().min(10).max(STYLE_INPUT_LIMIT).refine(value => value.trim().length >= 10),
  cover_ref: z.string().max(2048), visibility: z.enum(["public", "private"]),
  request_id: z.uuid(), id: z.uuid().optional(), updated_at: z.iso.datetime({ offset: true }).optional(),
}).strict();

export async function styleRateLimit(userId: string, scope: string, limit: number) {
  const rate = await checkRateLimit(`maro-styles:${scope}`, userId, limit, 86400, "strict");
  if (!rate.allowed) throw new StyleError("style_rate_limited", 429);
}

export async function writeStyle(req: Request, editing: boolean, platform = false) {
  try {
    const auth = platform ? await requireMoodAdmin(req) : await requireMoodUser(req);
    if (!auth.ok) return auth.response;
    const parsed = await readJsonBody(req, REQUEST_LIMITS.jsonDefault);
    if (!parsed.ok) return parsed.response;
    const draft = styleDraftSchema.safeParse(parsed.body);
    if (!draft.success) throw new StyleError("invalid_style");
    const body = draft.data, db = getSupabaseAdmin();
    if (editing && (!body.id || !body.updated_at)) throw new StyleError("invalid_style");
    if (!editing && (body.id || body.updated_at)) throw new StyleError("invalid_style");
    let current: Record<string, unknown> | null = null;
    if (editing) {
      const found = await db.from("maro_moods").select(STYLE_COLUMNS).eq("id", body.id).eq("created_by", auth.user.id).maybeSingle();
      if (found.error) throw new StyleError("styles_unavailable", 503);
      if (!found.data) throw new StyleError("style_not_found", 404);
      current = found.data;
      if (current.updated_at !== body.updated_at || (current.status === "processing" && Date.parse(String(current.updated_at)) > Date.now() - 120_000)) throw new StyleError("mood_changed", 409);
    } else {
      const previous = await db.from("maro_moods").select(STYLE_COLUMNS).eq("created_by", auth.user.id).eq("request_id", body.request_id).maybeSingle();
      if (previous.error) throw new StyleError("styles_unavailable", 503);
      if (previous.data) return styleResponse({ item: await styleView(previous.data, auth.user.id) });
    }
    const path = styleCoverPath(body.cover_ref, auth.user.id);
    // Owners may retain a legacy platform cover. No arbitrary remote URL or another user's object.
    if (!path && (!current || current.cover_url !== body.cover_ref)) throw new StyleError("invalid_style_cover");
    if (path) {
      const cover = await db.storage.from("generations").download(path);
      if (cover.error || !cover.data) throw new StyleError("invalid_style_cover");
    }
    await styleRateLimit(auth.user.id, "prepare", 10);
    const now = new Date().toISOString();
    const data = { title: body.title, input_text: body.input_text, description: body.input_text.trim().slice(0, 180),
      cover_url: body.cover_ref, visibility: body.visibility, status: "processing", active: false,
      rejection_reason: null, reviewed_by: null, reviewed_at: null, updated_at: now };
    const publisher = String(auth.user.user_metadata?.display_name || auth.user.user_metadata?.full_name || (auth.user.email?.toLowerCase() === "erzen@nice.al" ? "Erzen" : "Krijues")).trim().slice(0, 80) || "Krijues";
    const result = editing
      ? await db.from("maro_moods").update(data).eq("id", body.id).eq("created_by", auth.user.id).eq("updated_at", body.updated_at).select(STYLE_COLUMNS).maybeSingle()
      : await db.from("maro_moods").insert({ ...data, prompt: "Preparing style", created_by: auth.user.id, publisher_name: publisher, source: platform ? "platform" : "community", request_id: body.request_id }).select(STYLE_COLUMNS).single();
    if (result.error?.code === "23505") throw new StyleError("mood_changed", 409);
    if (result.error) throw new StyleError("styles_unavailable", 503);
    if (!result.data) throw new StyleError("mood_changed", 409);
    const id = result.data.id;
    try {
      const compiled = await expandStyle(body.title, body.input_text);
      const approved = platform; // Explicit admin creation, authenticated with the existing MFA/permission gate.
      const finished = await db.from("maro_moods").update({ ...compiled, status: approved ? "approved" : "pending", active: approved,
        ...(approved ? { reviewed_by: auth.user.id, reviewed_at: new Date().toISOString() } : {}), updated_at: new Date().toISOString() })
        .eq("id", id).eq("status", "processing").eq("updated_at", now).select(STYLE_COLUMNS).maybeSingle();
      if (finished.error) throw new StyleError("styles_unavailable", 503);
      if (!finished.data) throw new StyleError("mood_changed", 409);
      await writeAuditEvent({ actorId: auth.user.id, action: editing ? "styles.edit" : "styles.create", targetType: "maro_moods", targetId: id,
        metadata: { source: platform ? "platform" : "community", inputHash: createHash("sha256").update(body.input_text).digest("hex") } });
      return styleResponse({ item: await styleView(finished.data, auth.user.id) });
    } catch (error) {
      await db.from("maro_moods").update({ status: "failed", active: false, updated_at: new Date().toISOString() }).eq("id", id).eq("status", "processing").eq("updated_at", now);
      throw error;
    }
  } catch (error) { return styleFailure(error); }
}

export async function deleteStyle(req: Request, admin = false) {
  try {
    const auth = admin ? await requireMoodAdmin(req) : await requireMoodUser(req);
    if (!auth.ok) return auth.response;
    const parsed = await readJsonBody(req, REQUEST_LIMITS.jsonDefault);
    if (!parsed.ok) return parsed.response;
    const body = z.object({ id: z.uuid(), updated_at: z.iso.datetime({ offset: true }) }).strict().safeParse(parsed.body);
    if (!body.success) throw new StyleError("invalid_style");
    let query = getSupabaseAdmin().from("maro_moods").delete().eq("id", body.data.id).eq("updated_at", body.data.updated_at);
    if (!admin) query = query.eq("created_by", auth.user.id);
    const result = await query.select("id").maybeSingle();
    if (result.error) throw new StyleError("styles_unavailable", 503);
    if (!result.data) throw new StyleError("mood_changed", 409);
    await writeAuditEvent({ actorId: auth.user.id, action: "styles.delete", targetType: "maro_moods", targetId: body.data.id });
    return styleResponse({ deleted: true });
  } catch (error) { return styleFailure(error); }
}
