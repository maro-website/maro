import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSupabaseAdmin, supabaseServerConfigured, publishStoredUrlToExplore } from "@/lib/supabase/server";
import { getTool } from "@/lib/tools/registry";
import { exploreResponse, exploreUser, creatorProfiles, UUID } from "@/lib/explore/server";
import { normalizeUsername } from "@/lib/profiles/username";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const SELECT_FULL =
  "id,user_id,tool_id,prompt,url,author,created_at,slug,like_count,remix_count,featured,remix_of,selections,show_prompt,show_settings,save_count,view_count,deleted_at,updated_at";
const SELECT_LEGACY =
  "id,user_id,tool_id,prompt,url,author,created_at,slug,like_count,remix_count,featured,remix_of,selections,show_prompt,show_settings,deleted_at";
const privateHeaders = { "Cache-Control": "private, no-store" };

export async function GET(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ items: [] });
  const params = new URL(req.url).searchParams;
  const user = await exploreUser(req);
  const mine = params.get("mine") === "1", saved = params.get("saved") === "1";
  if ((mine || saved) && !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = getSupabaseAdmin();
  let authorId: string | undefined;
  const author = params.get("author");
  if (author) {
    if (UUID.test(author)) authorId = author;
    else {
      const username = normalizeUsername(author);
      if (!username) return NextResponse.json({ items: [] });
      const profile = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
      if (!profile.data?.id) return NextResponse.json({ items: [] });
      authorId = profile.data.id;
    }
  }
  let savedIds: string[] = [];
  if (saved && user) {
    const result = await admin.from("creation_saves").select("creation_id").eq("user_id", user.id);
    if (result.error) return NextResponse.json({ error: "unavailable" }, { status: 503 });
    savedIds = (result.data ?? []).map(item => item.creation_id as string);
    if (!savedIds.length) return NextResponse.json({ items: [] }, { headers: privateHeaders });
  }
  const slug = params.get("slug"), sort = params.get("sort") ?? "recent";
  const offset = Number(params.get("offset") ?? 0);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000) return NextResponse.json({ error: "bad-offset" }, { status: 400 });
  const select = (columns: string, modern: boolean) => {
    let query = admin.from("public_creations").select(columns);
    if (!mine) query = query.is("deleted_at", null);
    if (mine && user) query = query.eq("user_id", user.id);
    if (authorId) query = query.eq("user_id", authorId);
    if (saved) query = query.in("id", savedIds);
    if (slug) return query.eq(UUID.test(slug) ? "id" : "slug", slug).returns<Record<string, unknown>[]>();
    if (sort === "featured") query = query.eq("featured", true);
    if (sort === "liked" || sort === "trending") query = query.order("like_count", { ascending: false });
    if (modern && sort === "saved") query = query.order("save_count", { ascending: false });
    if (modern && sort === "viewed") query = query.order("view_count", { ascending: false });
    return query.order("created_at", { ascending: false }).order("id", { ascending: false }).returns<Record<string, unknown>[]>();
  };
  let rows: Record<string, unknown>[];
  if (slug) {
    const result = await select(SELECT_FULL, true).maybeSingle();
    if (result.error?.code === "42703") {
      const legacy = await select(SELECT_LEGACY, false).maybeSingle();
      if (legacy.error) return NextResponse.json({ error: "unavailable" }, { status: 503 });
      rows = legacy.data ? [legacy.data] : [];
    } else {
      if (result.error) return NextResponse.json({ error: "unavailable" }, { status: 503 });
      rows = result.data ? [result.data] : [];
    }
  } else {
    const result = await select(SELECT_FULL, true).range(offset, offset + 59);
    if (result.error?.code === "42703") {
      const legacy = await select(SELECT_LEGACY, false).range(offset, offset + 59);
      if (legacy.error) return NextResponse.json({ error: "unavailable" }, { status: 503 });
      rows = legacy.data ?? [];
    } else {
      if (result.error) return NextResponse.json({ error: "unavailable" }, { status: 503 });
      rows = result.data ?? [];
    }
  }
  const ids = rows.map(row => row.id as string);
  const profiles = await creatorProfiles(rows.map(row => row.user_id as string).filter(Boolean));
  let likedIds = new Set<string>(), userSavedIds = new Set<string>();
  if (user && ids.length) {
    const [likes, saves] = await Promise.all([
      admin.from("creation_likes").select("creation_id").eq("user_id", user.id).in("creation_id", ids),
      admin.from("creation_saves").select("creation_id").eq("user_id", user.id).in("creation_id", ids),
    ]);
    likedIds = new Set((likes.data ?? []).map(item => item.creation_id as string));
    userSavedIds = new Set((saves.data ?? []).map(item => item.creation_id as string));
  }
  const items = await Promise.all(rows.map(async row => {
    const profile = profiles.get(row.user_id as string);
    return { ...await exploreResponse(row, mine), author: profile?.full_name || row.author || "Krijues",
      username: profile?.username, author_avatar: profile?.avatar_url ?? null,
      liked: likedIds.has(row.id as string), saved: userSavedIds.has(row.id as string) };
  }));
  return NextResponse.json(slug ? { item: items[0] ?? null } : { items, nextOffset: rows.length === 60 ? offset + 60 : null }, { headers: privateHeaders });
}
async function bodyObject(req: Request): Promise<Record<string, unknown> | null> {
  const body: unknown = await req.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : null;
}
export async function POST(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const user = await exploreUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await bodyObject(req);
  if (!body) return NextResponse.json({ error: "bad-json" }, { status: 400 });
  const tool = getTool(typeof body.toolId === "string" ? body.toolId : "");
  if (!tool || tool.kind !== "image") return NextResponse.json({ error: "bad-tool" }, { status: 400 });
  if (typeof body.url !== "string" || body.url.length > 2048 || !body.url || body.url.startsWith("data:")) return NextResponse.json({ error: "bad-url" }, { status: 400 });
  if ((body.showPrompt !== undefined && typeof body.showPrompt !== "boolean") || (body.showSettings !== undefined && typeof body.showSettings !== "boolean")) return NextResponse.json({ error: "bad-privacy" }, { status: 400 });
  if (body.prompt !== undefined && (typeof body.prompt !== "string" || body.prompt.length > 64000)) return NextResponse.json({ error: "bad-prompt" }, { status: 400 });
  const selections = typeof body.selections === "object" && body.selections !== null && !Array.isArray(body.selections)
    ? Object.fromEntries(Object.entries(body.selections).filter(([key, value]) => key.length <= 64 && typeof value === "string" && value.length <= 128).slice(0, 30)) : {};
  const admin = getSupabaseAdmin();
  let remixOf: string | undefined;
  if (typeof body.remixOf === "string" && UUID.test(body.remixOf)) {
    const source = await admin.from("public_creations").select("id").eq("id", body.remixOf).is("deleted_at", null).eq("show_prompt", true).maybeSingle();
    if (source.data) remixOf = body.remixOf;
  }
  const { data: profile } = await admin.from("profiles").select("full_name").eq("id", user.id).single();
  const slug = randomUUID().replaceAll("-", "");
  const publicUrl = await publishStoredUrlToExplore({ storedUrl: body.url, slug, userId: user.id });
  if (!publicUrl) return NextResponse.json({ error: "publish-failed" }, { status: 400 });
  const { data, error } = await admin.from("public_creations").insert({ user_id: user.id, tool_id: tool.id,
    prompt: typeof body.prompt === "string" ? body.prompt.slice(0, 64000) : "", url: publicUrl,
    author: profile?.full_name || "Krijues", slug, selections,
    show_prompt: body.showPrompt === true, show_settings: body.showSettings === true,
    ...(remixOf ? { remix_of: remixOf } : {}),
    ...(typeof body.presetId === "string" && UUID.test(body.presetId) ? { preset_id: body.presetId } : {}),
  }).select("slug,id").single();
  if (error || !data) return NextResponse.json({ error: "insert-failed" }, { status: 503 });
  if (remixOf) {
    const source = await admin.from("public_creations").select("remix_count").eq("id", remixOf).single();
    if (source.data) await admin.from("public_creations").update({ remix_count: (source.data.remix_count ?? 0) + 1 }).eq("id", remixOf);
  }
  return NextResponse.json({ ok: true, slug: data.slug, id: data.id });
}
export async function PATCH(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const user = await exploreUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await bodyObject(req);
  if (!body || typeof body.id !== "string" || !UUID.test(body.id)) return NextResponse.json({ error: "bad-id" }, { status: 400 });
  const patch: Record<string, string | boolean | null> = { updated_at: new Date().toISOString() };
  if (body.restore === true) patch.deleted_at = null;
  if (typeof body.showPrompt === "boolean") patch.show_prompt = body.showPrompt;
  if (typeof body.showSettings === "boolean") patch.show_settings = body.showSettings;
  if (typeof body.prompt === "string" && body.prompt.length <= 64000) patch.prompt = body.prompt;
  const { data, error } = await getSupabaseAdmin().from("public_creations").update(patch).eq("id", body.id).eq("user_id", user.id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "save-failed" }, { status: 503 });
  return NextResponse.json({ ok: Boolean(data) }, { status: data ? 200 : 404 });
}
export async function DELETE(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const user = await exploreUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await bodyObject(req);
  if (!body || typeof body.id !== "string" || !UUID.test(body.id)) return NextResponse.json({ error: "bad-id" }, { status: 400 });
  const { data, error } = await getSupabaseAdmin().from("public_creations").update({ deleted_at: new Date().toISOString() }).eq("id", body.id).eq("user_id", user.id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "delete-failed" }, { status: 503 });
  return NextResponse.json({ ok: Boolean(data) }, { status: data ? 200 : 404 });
}
