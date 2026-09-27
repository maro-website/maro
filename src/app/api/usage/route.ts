import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  getUserFromToken,
  resolveWorkspaceId,
  supabaseServerConfigured,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  return h.startsWith("Bearer ") ? h.slice(7) : h;
}

// Return the signed-in user's generation history (all tools) plus totals, used
// Credit transaction history for account/usage views.
export async function GET(req: Request) {
  const empty = { items: [], totalCount: 0, totalCredits: 0, workspaceId: null as string | null };
  if (!supabaseServerConfigured()) return NextResponse.json(empty);
  const user = await getUserFromToken(bearer(req));
  if (!user) return NextResponse.json(empty);

  const url = new URL(req.url);
  const requested = url.searchParams.get("workspaceId");
  const workspaceId = await resolveWorkspaceId(user.id, requested);

  try {
    let query = getSupabaseAdmin()
      .from("generations")
      .select("id, tool_id, kind, prompt, credits_spent, website_type, created_at, workspace_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500);
    if (workspaceId) query = query.eq("workspace_id", workspaceId);
    const { data, error } = await query;
    if (error) return NextResponse.json({ ...empty, workspaceId });
    const rows = data ?? [];
    const items = rows.map((r) => ({
      id: r.id as string,
      toolId: (r.tool_id as string) ?? null,
      kind: (r.kind as string) ?? (r.website_type ? "website" : "generation"),
      prompt: (r.prompt as string) ?? "",
      credits: (r.credits_spent as number) ?? 0,
      createdAt: (r.created_at as string) ?? new Date().toISOString(),
    }));
    const totalCredits = items.reduce((a, r) => a + (r.credits || 0), 0);
    return NextResponse.json({ items, totalCount: items.length, totalCredits, workspaceId });
  } catch {
    return NextResponse.json({ ...empty, workspaceId });
  }
}
