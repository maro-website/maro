import "server-only";
import { getSupabaseAdmin, getUserFromToken, resolveAssetForClient } from "@/lib/supabase/server";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function requestToken(req: Request) {
  const value = req.headers.get("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7) : value;
}
export const exploreUser = (req: Request) => getUserFromToken(requestToken(req));

/** Public responses use an allowlist; private prompt/settings never leave the server. */
export async function exploreResponse(row: Record<string, unknown>, ownerView = false) {
  const showPrompt = row.show_prompt !== false;
  const showSettings = row.show_settings !== false;
  return {
    id: row.id, user_id: row.user_id, tool_id: row.tool_id,
    prompt: showPrompt || ownerView ? row.prompt : "",
    selections: showSettings || ownerView ? row.selections ?? {} : undefined,
    url: typeof row.url === "string" ? await resolveAssetForClient(row.url) : "",
    author: row.author, created_at: row.created_at, slug: typeof row.slug === "string" && row.slug ? row.slug : row.id,
    like_count: row.like_count ?? 0, save_count: row.save_count ?? 0, view_count: row.view_count ?? 0,
    remix_count: row.remix_count ?? 0, remix_of: row.remix_of, featured: row.featured,
    show_prompt: showPrompt, show_settings: showSettings,
    ...(ownerView ? { deleted_at: row.deleted_at, updated_at: row.updated_at } : {}),
  };
}
export async function creatorProfiles(ids: string[]) {
  if (!ids.length) return new Map<string, { username?: string; full_name?: string; avatar_url?: string }>();
  const { data } = await getSupabaseAdmin().from("profiles").select("id,username,full_name,avatar_url").in("id", [...new Set(ids)]);
  return new Map(await Promise.all((data ?? []).map(async profile => [profile.id as string, { ...profile,
    avatar_url: typeof profile.avatar_url === "string" ? await resolveAssetForClient(profile.avatar_url) : undefined,
  }] as const)));
}
