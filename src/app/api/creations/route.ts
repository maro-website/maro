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

// Return the signed-in user's image generations (server source of truth). This
// heals the case where a client navigated away mid-generation: the image was
// charged + stored server-side, so it reappears when the user returns.
export async function GET(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ items: [] });
  const user = await getUserFromToken(bearer(req));
  if (!user) return NextResponse.json({ items: [] });

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("generations")
      .select("id, tool_id, prompt, output_urls, created_at")
      .eq("user_id", user.id)
      .eq("kind", "image")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return NextResponse.json({ items: [] });
    const items = (data ?? [])
      .filter((r) => Array.isArray(r.output_urls) && r.output_urls.length > 0)
      .map((r) => ({
        id: r.id as string,
        toolId: (r.tool_id as string) ?? "logo",
        prompt: (r.prompt as string) ?? "",
        urls: (r.output_urls as string[]) ?? [],
        createdAt: (r.created_at as string) ?? new Date().toISOString(),
      }));
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
