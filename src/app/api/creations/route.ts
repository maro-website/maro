import { readJsonBody, REQUEST_LIMITS } from "@/lib/security/requestLimits";
import { NextResponse } from "next/server";
import { getTool } from "@/lib/tools/registry";
import { resolveGenerationLabels } from "@/lib/design/generationMeta";
import type { ConversationJob } from "@/lib/creations/conversations";
import { UUID } from "@/lib/explore/server";
import { isOwnedPrivateAssetPath, parseMaroStorageAsset, STORAGE_BUCKET } from "@/lib/storage/assets";
import {
  getSupabaseAdmin,
  getUserFromToken,
  getActiveWorkspaceId,
  supabaseServerConfigured,
  resolveAssetListForClient,
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

  // Try the full select (with favourite/title); fall back if the columns don't
  // exist yet (before migration 0007).
  const admin = getSupabaseAdmin();
  const params = new URL(req.url).searchParams;
  const workspace = params.get("workspace");
  const allWorkspaces = workspace === "all";
  const workspaceId = allWorkspaces ? null : await getActiveWorkspaceId(user.id);
  const conversation = params.get("conversation");
  const offset = Number(params.get("offset") ?? 0);
  if ((workspace !== null && workspace !== "all") || (allWorkspaces && conversation) || (conversation && !UUID.test(conversation)) || !Number.isSafeInteger(offset) || offset < 0 || offset > 100000) return NextResponse.json({ error: "bad-target" }, { status: 400 });
  let jobs: ConversationJob[] = [];
  if (conversation && offset === 0) {
    const pending = await admin.from("generation_jobs").select("id,status,created_at,request:metadata->v1_request")
      .eq("user_id", user.id).eq("metadata->v1_request->>conversationId", conversation)
      .in("status", ["pending", "reserved", "processing", "failed", "cancelled"]).order("created_at", { ascending: true }).limit(200);
    if (pending.error) return NextResponse.json({ error: "history-unavailable" }, { status: 503 });
    jobs = (pending.data ?? []).flatMap(row => {
      const snapshot = row.request as Record<string, unknown> | null;
      if (!snapshot || snapshot.userId !== user.id || (snapshot.workspaceId ?? null) !== workspaceId) return [];
      return [{ id: row.id as string, prompt: typeof snapshot.prompt === "string" ? snapshot.prompt : "", createdAt: row.created_at as string,
        status: row.status === "failed" || row.status === "cancelled" ? "error" as const : "thinking" as const }];
    });
  }
  const map = async (data: Record<string, unknown>[]) => {
    const items = await Promise.all(
      data
        .filter((r) => Array.isArray(r.output_urls) && (r.output_urls as unknown[]).length > 0)
        .map(async (r) => {
          const refs = (r.output_urls as string[]) ?? [];
          const tool = getTool((r.tool_id as string) ?? "logo");
          const selections = r.selections && typeof r.selections === "object" && !Array.isArray(r.selections)
            ? Object.fromEntries(Object.entries(r.selections).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : {};
          const labels = tool ? resolveGenerationLabels(tool, selections) : {};
          const urls = (await resolveAssetListForClient(refs)).filter(
            (url) => /^(https?:|data:|blob:)/i.test(url)
          );
          if (urls.length === 0) return null;
          return {
            id: r.id as string,
            serverId: r.id as string,
            toolId: (r.tool_id as string) ?? "logo",
            ...labels,
            conversationId: (r.conversation_id as string | null) ?? r.id as string,
            selections,
            brain: Boolean(r.brain),
            inputRefs: (r.input_refs as string[] | null) ?? undefined,
            inputUrls: Array.isArray(r.input_refs) ? await resolveAssetListForClient(r.input_refs as string[]) : undefined,
            logoWizard: r.logo_wizard ?? undefined,
            prompt: (r.prompt as string) ?? "",
            storageRefs: refs,
            urls,
            favourite: Boolean(r.favourite),
            title: (r.title as string) ?? undefined,
            workspaceId: (r.workspace_id as string | undefined) ?? workspaceId ?? undefined,
            createdAt: (r.created_at as string) ?? new Date().toISOString(),
          };
        })
    );
    return items.filter((item): item is NonNullable<typeof item> => item !== null);
  };

  try {
    let query = admin
      .from("generations")
      .select("id, tool_id, prompt, output_urls, favourite, title, workspace_id, created_at, conversation_id, selections, input_refs, logo_wizard, brain")
      .eq("user_id", user.id)
      .eq("kind", "image")
      .order("created_at", { ascending: false })
      .range(offset, offset + 199);
    if (workspaceId) query = query.eq("workspace_id", workspaceId);
    if (conversation) query = query.or(`conversation_id.eq.${conversation},id.eq.${conversation}`);
    const { data, error } = await query;
    if (!error) return NextResponse.json({ items: await map(data ?? []), jobs, nextOffset: data?.length === 200 ? offset + 200 : null }, { headers: { "Cache-Control": "private, no-store" } });
    if (error.code !== "42703") return NextResponse.json({ error: "history-unavailable" }, { status: 503 });
  } catch {
    return NextResponse.json({ error: "history-unavailable" }, { status: 503 });
  }

  try {
    let query = admin
      .from("generations")
      .select("id, tool_id, prompt, output_urls, created_at")
      .eq("user_id", user.id)
      .eq("kind", "image")
      .order("created_at", { ascending: false })
      .range(offset, offset + 199);
    if (workspaceId) query = query.eq("workspace_id", workspaceId);
    if (conversation) query = query.eq("id", conversation);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: "history-unavailable" }, { status: 503 });
    return NextResponse.json({ items: await map(data ?? []), jobs, nextOffset: data?.length === 200 ? offset + 200 : null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "history-unavailable" }, { status: 503 });
  }
}

// Update a creation's favourite flag / title. Keyed by the creation's first
// image URL (the client id is generated locally and may differ from the row id).
export async function PATCH(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ ok: false });
  const user = await getUserFromToken(bearer(req));
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { id?: string; url?: string; favourite?: boolean; title?: string };
  const boundedBody = await readJsonBody(req, REQUEST_LIMITS.jsonDefault);
  if (!boundedBody.ok) return boundedBody.response;
  if (!boundedBody.body || typeof boundedBody.body !== "object" || Array.isArray(boundedBody.body)) return NextResponse.json({ error: "bad-json" }, { status: 400 });
  try {
    body = boundedBody.body as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }
  if (!body.id && !body.url) return NextResponse.json({ error: "bad-target" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (typeof body.favourite === "boolean") patch.favourite = body.favourite;
  if (typeof body.title === "string") patch.title = body.title;
  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true });

  try {
    let query = getSupabaseAdmin()
      .from("generations")
      .update(patch)
      .eq("user_id", user.id);
    query = body.id ? query.eq("id", body.id) : query.contains("output_urls", [body.url!]);
    await query;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}

// Delete a creation server-side (keyed by first image URL).
export async function DELETE(req: Request) {
  if (!supabaseServerConfigured()) return NextResponse.json({ ok: false });
  const user = await getUserFromToken(bearer(req));
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { id?: string; url?: string; assetRefs?: string[] };
  const boundedBody = await readJsonBody(req, REQUEST_LIMITS.jsonDefault);
  if (!boundedBody.ok) return boundedBody.response;
  if (!boundedBody.body || typeof boundedBody.body !== "object" || Array.isArray(boundedBody.body)) return NextResponse.json({ error: "bad-json" }, { status: 400 });
  try {
    body = boundedBody.body as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }
  if (!body.id && !body.url) return NextResponse.json({ error: "bad-target" }, { status: 400 });

  // Asset cards delete particular outputs, preserving sibling images and chat metadata.
  if (body.assetRefs !== undefined) {
    if (!Array.isArray(body.assetRefs) || !body.assetRefs.length || body.assetRefs.length > 100 ||
        body.assetRefs.some(ref => typeof ref !== "string" || ref.length > 4096)) {
      return NextResponse.json({ error: "bad-target" }, { status: 400 });
    }
    try {
      const admin = getSupabaseAdmin();
      let lookup = admin.from("generations").select("id,output_urls").eq("user_id", user.id);
      lookup = body.id ? lookup.eq("id", body.id) : lookup.contains("output_urls", [body.url!]);
      const { data, error } = await lookup.maybeSingle();
      if (error) return NextResponse.json({ error: "asset-delete-failed" }, { status: 503 });
      if (!data) return NextResponse.json({ error: "not-found" }, { status: 404 });
      const refs: string[] = data.output_urls ?? [];
      const requested = new Set(body.assetRefs);
      if (body.assetRefs.some(ref => !refs.includes(ref))) return NextResponse.json({ error: "assets-changed" }, { status: 409 });
      const remaining = refs.filter(ref => !requested.has(ref));
      const arrayFilter = (values: string[]) => `{${values.map(value => JSON.stringify(value)).join(",")}}`;
      const updated = await admin.from("generations").update({ output_urls: remaining }).eq("user_id", user.id)
        .eq("id", data.id).eq("output_urls", arrayFilter(refs)).select("id").maybeSingle();
      if (updated.error) return NextResponse.json({ error: "asset-delete-failed" }, { status: 503 });
      if (!updated.data) return NextResponse.json({ error: "assets-changed" }, { status: 409 });
      const paths = [...requested].flatMap(value => {
        const ref = parseMaroStorageAsset(value);
        return ref?.bucket === STORAGE_BUCKET && isOwnedPrivateAssetPath(ref.path, user.id) ? [ref.path] : [];
      });
      if (paths.length) {
        const removed = await admin.storage.from(STORAGE_BUCKET).remove([...new Set(paths)]);
        if (removed.error) {
          // Restore the library entry if storage failed, without overwriting a concurrent edit.
          await admin.from("generations").update({ output_urls: refs }).eq("user_id", user.id)
            .eq("id", data.id).eq("output_urls", arrayFilter(remaining));
          return NextResponse.json({ error: "asset-delete-failed" }, { status: 503 });
        }
      }
      return NextResponse.json({ ok: true });
    } catch { return NextResponse.json({ error: "asset-delete-failed" }, { status: 503 }); }
  }

  try {
    let query = getSupabaseAdmin()
      .from("generations")
      .delete()
      .eq("user_id", user.id);
    query = body.id ? query.eq("id", body.id) : query.contains("output_urls", [body.url!]);
    await query;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
