import { NextResponse } from "next/server";
import { getSupabaseAdmin, resolveAssetForClient, supabaseServerConfigured } from "@/lib/supabase/server";
import { exploreUser, UUID } from "@/lib/explore/server";
import { normalizeUsername } from "@/lib/profiles/username";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const handle = new URL(req.url).searchParams.get("user") ?? "";
  const username = normalizeUsername(handle);
  if (!UUID.test(handle) && !username) return NextResponse.json({ error: "not-found" }, { status: 404 });
  let query = getSupabaseAdmin().from("profiles").select("id,full_name,username,avatar_url");
  query = UUID.test(handle) ? query.eq("id", handle) : query.eq("username", username!);
  const { data, error } = await query.maybeSingle();
  if (error) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  if (!data) return NextResponse.json({ error: "not-found" }, { status: 404 });
  return NextResponse.json({ profile: { id: data.id, name: data.full_name || "Krijues", username: data.username, avatarUrl: data.avatar_url ? await resolveAssetForClient(data.avatar_url) : null } }, { headers: { "Cache-Control": "no-store" } });
}
export async function PATCH(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const user = await exploreUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const username = normalizeUsername(body?.username);
  if (!username) return NextResponse.json({ error: "invalid-username" }, { status: 400 });
  const { data, error } = await getSupabaseAdmin().from("profiles").update({ username }).eq("id", user.id).select("username").single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "username-taken" : "save-failed" }, { status: error.code === "23505" ? 409 : 503 });
  return NextResponse.json({ username: data.username });
}
