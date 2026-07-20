import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  getUserFromToken,
  refundCredits,
  supabaseServerConfigured,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  return h.startsWith("Bearer ") ? h.slice(7) : h;
}

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const user = await getUserFromToken(bearer(req));
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();
  const { data: prof } = await admin.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!prof?.is_admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { id?: string; action?: "refund" | "archive" };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }
  const { id, action } = body;
  if (!id || !action) return NextResponse.json({ error: "bad-request" }, { status: 400 });

  const { data: report } = await admin.from("reports").select("*").eq("id", id).single();
  if (!report) return NextResponse.json({ error: "not-found" }, { status: 404 });

  if (action === "refund") {
    if (report.user_id && (report.credits_spent ?? 0) > 0) {
      await refundCredits(report.user_id as string, report.credits_spent as number);
    }
    await admin.from("reports").update({ status: "refunded" }).eq("id", id);
    return NextResponse.json({ ok: true, status: "refunded" });
  }

  await admin.from("reports").update({ status: "archived" }).eq("id", id);
  return NextResponse.json({ ok: true, status: "archived" });
}
