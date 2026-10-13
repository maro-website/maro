import "server-only";
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getSupabaseAdmin, getUserFromToken } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/admin/auth";
import { ImageRequestValidationError } from "@/lib/generation/requestValidation";
import { canUseMoods } from "./model";

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
  const { data, error } = await db.from("maro_moods").select("id,title,prompt,active").eq("id", moodId).eq("active", true).maybeSingle();
  if (error) throw new ImageRequestValidationError("mood_configuration_unavailable", 503, "moodId");
  if (!data?.prompt?.trim()) throw new ImageRequestValidationError("mood_unavailable", 400, "moodId");
  return { prompt: data.prompt as string, title: data.title as string, hash: createHash("sha256").update(data.prompt).digest("hex") };
}
