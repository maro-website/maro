import { NextResponse } from "next/server";
import { getSupabaseAdmin, supabaseServerConfigured } from "@/lib/supabase/server";
import { exploreUser, UUID } from "@/lib/explore/server";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const user = await exploreUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body: { creationId?: unknown; saved?: unknown } | null = await req.json().catch(() => null);
  if (!body || typeof body.creationId !== "string" || !UUID.test(body.creationId) || typeof body.saved !== "boolean") return NextResponse.json({ error: "bad-input" }, { status: 400 });
  const { data, error } = await getSupabaseAdmin().rpc("toggle_creation_save", { p_user: user.id, p_creation: body.creationId, p_add: body.saved });
  if (error) return NextResponse.json({ error: "save-failed" }, { status: 503 });
  return NextResponse.json({ save_count: data });
}
