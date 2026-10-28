import "server-only";
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getSupabaseAdmin, getUserFromToken } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/admin/auth";
import { ImageRequestValidationError } from "@/lib/generation/requestValidation";
import { canUseMoods, canUseMood, type Mood } from "./model";

export const MOOD_HEADERS = { "Cache-Control": "private, no-store", Vary: "Authorization" };
export async function requireMoodUser(req: Request) {
  const header = req.headers.get("authorization");
  const user = await getUserFromToken(header?.startsWith("Bearer ") ? header.slice(7) : header);
  if (!user) return { ok: false as const, response: NextResponse.json({ error: "unauthorized" }, { status: 401, headers: MOOD_HEADERS }) };
  if (!canUseMoods(user.email)) return { ok: false as const, response: NextResponse.json({ error: "moods_unavailable" }, { status: 403, headers: MOOD_HEADERS }) };
  return { ok: true as const, user };
}

export async function requireMoodAdmin(req: Request) {
  const user = await requireMoodUser(req);
  if (!user.ok) return user;
  const permission = await requirePermission(req, "presets.manage");
  if (!permission.ok) return { ok: false as const, response: NextResponse.json({ error: permission.error }, { status: permission.status, headers: MOOD_HEADERS }) };
  return { ...permission, user: user.user };
}

/** Verify the authoritative auth account, never a client/profile email. Resolve before credit reservation. */
export async function resolveGenerationMood(userId: string, moodId: string) {
  const db = getSupabaseAdmin();
  const account = await db.auth.admin.getUserById(userId);
  if (account.error || !canUseMoods(account.data.user?.email)) throw new ImageRequestValidationError("moods_unavailable", 403, "moodId");
  const { data, error } = await db.from("maro_moods").select("id,title,prompt,active,status,visibility,created_by").eq("id", moodId).eq("active", true).maybeSingle();
  if (error) throw new ImageRequestValidationError("mood_configuration_unavailable", 503, "moodId");
  if (!data?.prompt?.trim() || !canUseMood(data, userId)) throw new ImageRequestValidationError("mood_unavailable", 400, "moodId");
  return { prompt: data.prompt as string, title: data.title as string, hash: createHash("sha256").update(data.prompt).digest("hex") };
}

/** Shared views exclude the compiled prompt; only the authorized admin GET adds it. */
export const STYLE_COLUMNS = "id,title,description,cover_url,sort_order,created_by,publisher_name,source,visibility,status,input_text,rejection_reason,updated_at,active,created_at";
export const styleResponse = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: MOOD_HEADERS });
export class StyleError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function styleFailure(error: unknown) {
  return styleResponse({ error: error instanceof StyleError ? error.message : "styles_unavailable" }, error instanceof StyleError ? error.status : 503);
}
export function styleCoverPath(ref: unknown, ownerId?: string): string | null {
  if (typeof ref !== "string") return null;
  const match = /^storage:generations\/(_moods\/([0-9a-f-]{36})\/[0-9a-f-]{36}\.webp)$/.exec(ref);
  return match && (!ownerId || match[2] === ownerId) ? match[1] : null;
}
export async function styleView(row: Record<string, unknown>, userId: string, admin = false): Promise<Mood & { active: boolean }> {
  const owner = row.created_by === userId;
  const ref = row.cover_url as string | null;
  let cover = ref;
  const path = styleCoverPath(ref);
  if (path) {
    // Short-lived capabilities are issued only after the caller authorizes this exact row.
    const signed = await getSupabaseAdmin().storage.from("generations").createSignedUrl(path, 120);
    cover = signed.data?.signedUrl ?? null;
  } else if (ref?.startsWith("storage:")) cover = null;
  return {
    id: row.id as string, title: row.title as string, description: row.description as string,
    cover_url: cover, sort_order: Number(row.sort_order), saved: false,
    created_by: row.created_by as string | null, publisher_name: row.publisher_name as string,
    source: row.source as Mood["source"], visibility: row.visibility as Mood["visibility"],
    status: row.status as Mood["status"], active: row.active === true,
    ...(owner || admin ? { input_text: row.input_text as string, cover_ref: ref, updated_at: row.updated_at as string, rejection_reason: row.rejection_reason as string | null } : {}),
  };
}
