import { NextResponse } from "next/server";
import { getSupabaseAdmin, supabaseServerConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEMO_CHALLENGE = {
  id: "00000000-0000-4000-b000-000000000001",
  slug: "javor-2026",
  title: "Sfida javore: Produkt lokal",
  prompt_hint: "Krijo një reklamë për një produkt shqiptar me estetikë premium.",
  tool_id: "reklama",
  reward_credits: 50,
  ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
};

export async function GET() {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ challenge: DEMO_CHALLENGE, leaderboard: [] });
  }

  const admin = getSupabaseAdmin();
  try {
    const { data: challenge } = await admin
      .from("weekly_challenges")
      .select("*")
      .eq("active", true)
      .order("ends_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const active = challenge ?? DEMO_CHALLENGE;
    const { data: entries } = await admin
      .from("challenge_entries")
      .select("user_id, score")
      .eq("challenge_id", active.id)
      .order("score", { ascending: false })
      .limit(20);

    return NextResponse.json({ challenge: active, leaderboard: entries ?? [] });
  } catch {
    return NextResponse.json({ challenge: DEMO_CHALLENGE, leaderboard: [] });
  }
}
