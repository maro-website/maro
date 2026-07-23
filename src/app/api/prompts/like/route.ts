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

// Toggle a like on a curated prompt for the signed-in user.
export async function POST(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const user = await getUserFromToken(bearer(req));
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { promptId?: string; liked?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }
  if (!body.promptId) return NextResponse.json({ error: "bad-request" }, { status: 400 });

  const admin = getSupabaseAdmin();
  try {
    if (body.liked) {
      await admin
        .from("prompt_likes")
        .upsert(
          { user_id: user.id, prompt_id: body.promptId },
          { onConflict: "user_id,prompt_id", ignoreDuplicates: true }
        );
    } else {
      await admin
        .from("prompt_likes")
        .delete()
        .eq("user_id", user.id)
        .eq("prompt_id", body.promptId);
    }
    return NextResponse.json({ ok: true, liked: Boolean(body.liked) });
  } catch {
    return NextResponse.json({ error: "like-failed" }, { status: 500 });
  }
}
