import { NextResponse } from "next/server";
import { requireUser } from "@/lib/payments/auth";
import { getSupabaseAdmin, supabaseServerConfigured } from "@/lib/supabase/server";

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ notifications: [] });
  }

  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const limit = Math.min(Number(new URL(req.url).searchParams.get("limit") ?? 50), 100);

  const { data, error } = await getSupabaseAdmin()
    .from("user_notifications")
    .select("id, dedupe_key, kind, title, body, action_href, read_at, metadata, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    notifications: (data ?? []).map((row) => ({
      id: row.id as string,
      dedupeKey: row.dedupe_key as string,
      kind: row.kind as string,
      title: row.title as string,
      body: (row.body as string) ?? "",
      actionHref: (row.action_href as string | null) ?? null,
      readAt: (row.read_at as string | null) ?? null,
      createdAt: row.created_at as string,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
    })),
  });
}

export async function PATCH(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ ok: true });
  }

  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { markAllRead?: boolean; ids?: string[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();

  if (body.markAllRead) {
    await admin
      .from("user_notifications")
      .update({ read_at: now })
      .eq("user_id", user.id)
      .is("read_at", null);
    return NextResponse.json({ ok: true });
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
  if (ids.length > 0) {
    await admin
      .from("user_notifications")
      .update({ read_at: now })
      .eq("user_id", user.id)
      .in("id", ids);
  }

  return NextResponse.json({ ok: true });
}
