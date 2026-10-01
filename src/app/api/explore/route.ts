import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  getUserFromToken,
  supabaseServerConfigured,
  publishStoredUrlToExplore,
  resolveAssetForClient,
} from "@/lib/supabase/server";
import { getTool } from "@/lib/tools/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  return h.startsWith("Bearer ") ? h.slice(7) : h;
}

function slugify(): string {
  return Math.random().toString(36).slice(2, 10);
}

const SELECT_FULL =
  "id, user_id, tool_id, prompt, url, author, created_at, slug, like_count, remix_count, featured, remix_of";
const SELECT_LEGACY =
  "id, user_id, tool_id, prompt, url, author, created_at, slug, like_count, remix_count, featured, remix_of";

async function resolveExploreRow<T extends Record<string, unknown> | null>(row: T): Promise<T> {
  if (!row) return row;
  const resolved = { ...row };
  if (typeof row.url === "string") resolved.url = await resolveAssetForClient(row.url);
  if (typeof row.author_avatar === "string") resolved.author_avatar = await resolveAssetForClient(row.author_avatar);
  return resolved as T;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sort = url.searchParams.get("sort") ?? "recent";
  const slug = url.searchParams.get("slug");

  if (!supabaseServerConfigured()) return NextResponse.json({ items: [] });

  const admin = getSupabaseAdmin();
  const user = await getUserFromToken(bearer(req));

  if (slug) {
    try {
      const { data } = await admin.from("public_creations").select(SELECT_FULL).eq("slug", slug).maybeSingle();
      return NextResponse.json({ item: await resolveExploreRow(data ?? null) });
    } catch {
      const { data } = await admin
        .from("public_creations")
        .select(SELECT_LEGACY)
        .eq("slug", slug)
        .maybeSingle();
      return NextResponse.json({ item: await resolveExploreRow(data ?? null) });
    }
  }

  let query = admin.from("public_creations").select(SELECT_FULL);

  if (sort === "trending") {
    query = query.order("like_count", { ascending: false }).order("created_at", { ascending: false });
  } else if (sort === "featured") {
    query = query.eq("featured", true).order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  try {
    const { data, error } = await query.limit(90);
    if (error) throw error;

    let likedSet = new Set<string>();
    if (user && data?.length) {
      try {
        const { data: likes } = await admin
          .from("creation_likes")
          .select("creation_id")
          .eq("user_id", user.id)
          .in(
            "creation_id",
            data.map((d) => d.id)
          );
        likedSet = new Set((likes ?? []).map((l) => l.creation_id as string));
      } catch {
        /* likes table may not exist yet */
      }
    }

    const items = await Promise.all((data ?? []).map(async (row) => ({
      ...(await resolveExploreRow(row)),
      liked: likedSet.has(row.id as string),
    })));
    return NextResponse.json({ items });
  } catch {
    const { data } = await admin
      .from("public_creations")
      .select(SELECT_LEGACY)
      .order("created_at", { ascending: false })
      .limit(90);
    return NextResponse.json({ items: await Promise.all((data ?? []).map(resolveExploreRow)) });
  }
}

export async function POST(req: Request) {
  if (!supabaseServerConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }
  const user = await getUserFromToken(bearer(req));
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: {
    toolId?: string;
    prompt?: string;
    url?: string;
    selections?: Record<string, string>;
    presetId?: string;
    remixOf?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  const tool = getTool(body.toolId ?? "");
  if (!tool) return NextResponse.json({ error: "bad-tool" }, { status: 400 });
  if (!body.url || body.url.startsWith("data:")) {
    return NextResponse.json({ error: "bad-url" }, { status: 400 });
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
  const authorAvatar = (user.user_metadata?.avatar_url as string | undefined) || null;

  const slug = slugify();
  const publicUrl = await publishStoredUrlToExplore({ storedUrl: body.url, slug });
  if (!publicUrl) {
    return NextResponse.json({ error: "publish-failed" }, { status: 400 });
  }

  const row: Record<string, unknown> = {
    user_id: user.id,
    tool_id: tool.id,
    prompt: (body.prompt ?? "").slice(0, 2000),
    url: publicUrl,
    author,
    slug,
  };

  if (body.selections) row.selections = body.selections;
  if (body.presetId) row.preset_id = body.presetId;
  if (body.remixOf) row.remix_of = body.remixOf;

  try {
    const { data, error } = await admin
      .from("public_creations")
      .insert({ ...row, author_avatar: authorAvatar })
      .select("slug")
      .single();
    if (error) throw error;

    if (body.remixOf) {
      try {
        const { data: row } = await admin
          .from("public_creations")
          .select("remix_count")
          .eq("id", body.remixOf)
          .single();
        await admin
          .from("public_creations")
          .update({ remix_count: (row?.remix_count ?? 0) + 1 })
          .eq("id", body.remixOf);
      } catch {
        /* column may not exist yet */
      }
    }

    return NextResponse.json({ ok: true, slug: data?.slug });
  } catch {
    try {
      const { data } = await admin
        .from("public_creations")
        .insert(row)
        .select("slug")
        .single();
      return NextResponse.json({ ok: true, slug: data?.slug ?? slugify() });
    } catch {
      return NextResponse.json({ error: "insert-failed" }, { status: 500 });
    }
  }
}
