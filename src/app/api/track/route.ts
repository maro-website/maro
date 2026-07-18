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

// Record a prompt view/copy event (best-effort analytics). Auth is optional.
export async function POST(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ ok: false });

  let body: { kind?: string; toolId?: string; prompt?: string; url?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  const kind = body.kind === "copy" ? "copy" : body.kind === "view" ? "view" : null;
  if (!kind) return NextResponse.json({ error: "bad-kind" }, { status: 400 });

  const user = await getUserFromToken(bearer(req));

  try {
    await getSupabaseAdmin().from("prompt_events").insert({
      kind,
      tool_id: body.toolId ?? null,
      prompt: (body.prompt ?? "").slice(0, 2000),
      url: body.url ?? null,
      user_id: user?.id ?? null,
    });
  } catch {
    /* table may not exist yet — ignore */
  }
  return NextResponse.json({ ok: true });
}
