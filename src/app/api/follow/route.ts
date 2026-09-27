import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  getUserFromToken,
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

  let body: { creatorId?: string; follow?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  if (!body.creatorId || typeof body.follow !== "boolean") {
    return NextResponse.json({ error: "bad-input" }, { status: 400 });
  }
  if (body.creatorId === user.id) {
    return NextResponse.json({ error: "self" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  try {
    if (body.follow) {
      await admin.from("creator_follows").upsert({
        follower_id: user.id,
        creator_id: body.creatorId,
      });
    } else {
      await admin
        .from("creator_follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("creator_id", body.creatorId);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
