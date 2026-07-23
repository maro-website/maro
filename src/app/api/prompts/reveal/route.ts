import { NextResponse } from "next/server";
import {
  getAppSettings,
  getProfileCredits,
  getSupabaseAdmin,
  getUserFromToken,
  supabaseServerConfigured,
} from "@/lib/supabase/server";
import { DEFAULT_PROMPT_REVEAL_COST } from "@/lib/prompts/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  return h.startsWith("Bearer ") ? h.slice(7) : h;
}

// Reveal-and-copy a curated prompt for external use. Costs credits once; the
// unlock is recorded so the user can re-copy the raw prompt forever for free.
export async function POST(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const user = await getUserFromToken(bearer(req));
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { promptId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }
  if (!body.promptId) return NextResponse.json({ error: "bad-request" }, { status: 400 });

  const settings = await getAppSettings();
  const cost = settings.pricing.promptRevealCost ?? DEFAULT_PROMPT_REVEAL_COST;
  const admin = getSupabaseAdmin();

  // Atomic: charge (only if not already owned + enough credits) and record.
  let status: string;
  try {
    const { data, error } = await admin.rpc("reveal_prompt", {
      p_user: user.id,
      p_prompt: body.promptId,
      p_cost: cost,
    });
    if (error) throw new Error(error.message);
    status = String(data);
  } catch {
    return NextResponse.json({ error: "reveal-failed" }, { status: 500 });
  }

  if (status === "missing") return NextResponse.json({ error: "not-found" }, { status: 404 });
  if (status === "insufficient") {
    const profile = await getProfileCredits(user.id);
    return NextResponse.json(
      { error: "insufficient-credits", needed: cost, have: profile?.credits ?? 0 },
      { status: 402 }
    );
  }

  // "ok" (just charged) or "owned" (already unlocked) — return the raw prompt.
  const { data: row } = await admin
    .from("maro_prompts")
    .select("full_prompt")
    .eq("id", body.promptId)
    .single();

  return NextResponse.json({
    fullPrompt: (row?.full_prompt as string) ?? "",
    alreadyOwned: status === "owned",
    creditsSpent: status === "ok" ? cost : 0,
  });
}
