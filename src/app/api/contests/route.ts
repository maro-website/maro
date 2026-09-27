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

const DEMO_CONTESTS = [
  {
    id: "00000000-0000-4000-a000-000000000001",
    slug: "maro-krijues-1",
    title: "maro Krijues #1",
    description: "Krijo vizualin më të mirë me maro Imazh dhe fito kredite.",
    prize_label: "10000 kredite në pool",
    prize_credits: 10000,
    cover_url: null,
    status: "open",
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
  },
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  const submissions = url.searchParams.get("submissions");

  if (!supabaseServerConfigured()) {
    if (slug) {
      const item = DEMO_CONTESTS.find((c) => c.slug === slug) ?? null;
      return NextResponse.json({ item });
    }
    if (submissions) return NextResponse.json({ items: [] });
    return NextResponse.json({ items: DEMO_CONTESTS });
  }

  const admin = getSupabaseAdmin();

  if (submissions) {
    try {
      const { data } = await admin
        .from("contest_submissions")
        .select("id, contest_id, user_id, url, prompt, author, winner, created_at")
        .eq("contest_id", submissions)
        .order("created_at", { ascending: false })
        .limit(100);
      return NextResponse.json({ items: data ?? [] });
    } catch {
      return NextResponse.json({ items: [] });
    }
  }

  if (slug) {
    try {
      const { data } = await admin.from("contests").select("*").eq("slug", slug).maybeSingle();
      return NextResponse.json({ item: data ?? DEMO_CONTESTS.find((c) => c.slug === slug) ?? null });
    } catch {
      return NextResponse.json({ item: DEMO_CONTESTS.find((c) => c.slug === slug) ?? null });
    }
  }

  try {
    const { data } = await admin
      .from("contests")
      .select("*")
      .in("status", ["open", "announced"])
      .order("ends_at", { ascending: true });
    return NextResponse.json({ items: data?.length ? data : DEMO_CONTESTS });
  } catch {
    return NextResponse.json({ items: DEMO_CONTESTS });
  }
}

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const user = await getUserFromToken(bearer(req));
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { contestId?: string; url?: string; prompt?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  if (!body.contestId || !body.url) {
    return NextResponse.json({ error: "bad-input" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();
  const author =
    (profile?.full_name as string) ||
    (profile?.email as string | undefined)?.split("@")[0] ||
    "Anonim";

  try {
    const { error } = await admin.from("contest_submissions").insert({
      contest_id: body.contestId,
      user_id: user.id,
      url: body.url,
      prompt: (body.prompt ?? "").slice(0, 2000),
      author,
    });
    if (error) return NextResponse.json({ error: "insert-failed" }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "insert-failed" }, { status: 500 });
  }
}
