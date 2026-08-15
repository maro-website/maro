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

const REWARD_MILESTONES: Record<number, number> = { 10: 5, 50: 15, 100: 50 };

async function maybeRewardCreator(
  admin: ReturnType<typeof getSupabaseAdmin>,
  creationId: string,
  likeCount: number
) {
  const reward = REWARD_MILESTONES[likeCount];
  if (!reward) return;
  try {
    const { data: creation } = await admin
      .from("public_creations")
      .select("user_id")
      .eq("id", creationId)
      .single();
    if (!creation?.user_id) return;
    const { data: profile } = await admin
      .from("profiles")
      .select("credits")
      .eq("id", creation.user_id)
      .single();
    await admin
      .from("profiles")
      .update({ credits: (profile?.credits ?? 0) + reward })
      .eq("id", creation.user_id);
  } catch {
    /* best-effort */
  }
}

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const user = await getUserFromToken(bearer(req));
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { creationId?: string; liked?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  if (!body.creationId || typeof body.liked !== "boolean") {
    return NextResponse.json({ error: "bad-input" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  try {
    const { data, error } = await admin.rpc("bump_creation_like", {
      p_user: user.id,
      p_creation: body.creationId,
      p_add: body.liked,
    });
    if (!error) {
      const likeCount = (data as number) ?? 0;
      await maybeRewardCreator(admin, body.creationId, likeCount);
      return NextResponse.json({ like_count: likeCount });
    }
  } catch {
    /* fall through */
  }

  try {
    if (body.liked) {
      await admin.from("creation_likes").upsert({ user_id: user.id, creation_id: body.creationId });
    } else {
      await admin
        .from("creation_likes")
        .delete()
        .eq("user_id", user.id)
        .eq("creation_id", body.creationId);
    }
    const { data } = await admin
      .from("public_creations")
      .select("like_count")
      .eq("id", body.creationId)
      .single();
    return NextResponse.json({ like_count: data?.like_count ?? 0 });
  } catch {
    return NextResponse.json({ like_count: 0 });
  }
}
