import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requirePermission(req, "credits.adjust");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 100 || !/^[\p{L}\p{N}@._+ -]+$/u.test(q)) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  // Escape LIKE wildcards; the remaining filter grammar characters are rejected above.
  const term = q.replace(/_/g, "\\_");
  const { data, error } = await getSupabaseAdmin().from("profiles").select("id,email,username,full_name")
    .or(`email.ilike.%${term}%,username.ilike.%${term}%`).order("email").limit(10);
  if (error) return NextResponse.json({ error: "users_unavailable" }, { status: 503 });
  return NextResponse.json({ users: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}
