import { NextResponse } from "next/server";
import { randomUUID, createHmac, timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin, supabaseServerConfigured } from "@/lib/supabase/server";
import { exploreUser, UUID } from "@/lib/explore/server";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseServerConfigured() || !secret) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const body: { creationId?: unknown } | null = await req.json().catch(() => null);
  if (!body || typeof body.creationId !== "string" || !UUID.test(body.creationId)) return NextResponse.json({ error: "bad-input" }, { status: 400 });
  const user = await exploreUser(req);
  const sign = (text: string) => createHmac("sha256", secret).update(text).digest("hex");
  const cookie = (req.headers.get("cookie") ?? "").match(/(?:^|;\s*)maro_explore_viewer=([0-9a-f-]+)\.([0-9a-f]{64})(?:;|$)/);
  const valid = cookie && UUID.test(cookie[1]) && timingSafeEqual(Buffer.from(sign(cookie[1]), "hex"), Buffer.from(cookie[2], "hex"));
  const visitor = valid ? cookie![1] : randomUUID();
  const { data, error } = await getSupabaseAdmin().rpc("record_creation_view", { p_creation: body.creationId, p_visitor: sign(user ? `user:${user.id}` : `visitor:${visitor}`) });
  if (error) return NextResponse.json({ error: "view-failed" }, { status: 503 });
  const response = NextResponse.json({ view_count: data }, { headers: { "Cache-Control": "no-store" } });
  if (!valid && !user) response.cookies.set("maro_explore_viewer", `${visitor}.${sign(visitor)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 24 * 365, path: "/api/explore" });
  return response;
}
