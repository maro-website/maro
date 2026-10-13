import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";
import { writeAuditEvent } from "@/lib/admin/audit";
import { requireMoodAdmin, MOOD_HEADERS } from "@/lib/moods/server";
import { MOOD_ID } from "@/lib/moods/model";

export const dynamic = "force-dynamic";
const COLUMNS = "id,title,description,cover_url,prompt,active,sort_order,updated_at";
const response = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: MOOD_HEADERS });

export async function GET(req: Request) {
  const auth = await requireMoodAdmin(req);
  if (!auth.ok) return auth.response;
  const { data, error } = await getSupabaseAdmin().from("maro_moods").select(COLUMNS).order("sort_order").order("created_at").order("id");
  return error ? response({ error: "moods_unavailable" }, 503) : response({ items: data ?? [] });
}

async function write(req: Request, editing: boolean) {
  const auth = await requireMoodAdmin(req);
  if (!auth.ok) return auth.response;
  const parsed = await readJsonBody(req, REQUEST_LIMITS.jsonDefault);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as Record<string, unknown> | null;
  if (!body || Array.isArray(body) || typeof body.title !== "string" || !body.title.trim() || body.title.length > 140 || typeof body.prompt !== "string" || !body.prompt.trim() || body.prompt.length > 6000 || typeof body.description !== "string" || body.description.length > 1000 || typeof body.active !== "boolean" || !Number.isSafeInteger(body.sort_order) || Number(body.sort_order) < 0 || Number(body.sort_order) > 100000) return response({ error: "invalid-fields" }, 400);
  if (editing && (typeof body.id !== "string" || !MOOD_ID.test(body.id) || typeof body.updated_at !== "string")) return response({ error: "invalid-id" }, 400);
  const cover = body.cover_url;
  if (cover !== null && cover !== "" && (typeof cover !== "string" || cover.length > 2048 || !validCover(cover))) return response({ error: "invalid-cover" }, 400);
  const record = { title: body.title.trim(), description: body.description.trim(), prompt: body.prompt.trim(), active: body.active, cover_url: cover || null, sort_order: body.sort_order, updated_at: new Date().toISOString() };
  const db = getSupabaseAdmin();
  const result = editing
    ? await db.from("maro_moods").update(record).eq("id", body.id).eq("updated_at", body.updated_at).select(COLUMNS).maybeSingle()
    : await db.from("maro_moods").insert({ ...record, created_by: auth.user.id }).select(COLUMNS).single();
  if (result.error) return response({ error: "save-failed" }, 503);
  if (!result.data) return response({ error: "mood_changed", message: "Mood-i është ndryshuar. Rifresko dhe provo përsëri." }, 409);
  await writeAuditEvent({ actorId: auth.user.id, action: editing ? "moods.update" : "moods.create", targetType: "maro_moods", targetId: result.data.id, requestId: auth.requestId });
  return response({ item: result.data });
}
function validCover(value: string) {
  if (/^\/images\/moods\/[a-z0-9-]+\.svg$/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.origin === new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin && url.pathname.startsWith("/storage/v1/object/public/maro-public/public/moods/") && !url.search && !url.hash;
  } catch { return false; }
}
export const POST = (req: Request) => write(req, false);
export const PUT = (req: Request) => write(req, true);

export async function DELETE(req: Request) {
  const auth = await requireMoodAdmin(req);
  if (!auth.ok) return auth.response;
  const parsed = await readJsonBody(req, REQUEST_LIMITS.jsonDefault);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as { id?: unknown; updated_at?: unknown } | null;
  if (!body || typeof body.id !== "string" || !MOOD_ID.test(body.id) || typeof body.updated_at !== "string") return response({ error: "invalid-id" }, 400);
  const { data, error } = await getSupabaseAdmin().from("maro_moods").delete().eq("id", body.id).eq("updated_at", body.updated_at).select("id").maybeSingle();
  if (error) return response({ error: "delete-failed" }, 503);
  if (!data) return response({ error: "mood_changed" }, 409);
  await writeAuditEvent({ actorId: auth.user.id, action: "moods.delete", targetType: "maro_moods", targetId: body.id, requestId: auth.requestId });
  return response({ deleted: true });
}
