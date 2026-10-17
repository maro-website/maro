import "server-only";
import { NextResponse } from "next/server";
import { isDeepStrictEqual } from "node:util";
import { getSupabaseAdmin, getUserFromToken, supabaseServerConfigured } from "@/lib/supabase/server";
import { requireBrainAccess, AccountPolicyError } from "@/lib/workspaces/accountPolicyServer";
import { readJsonBody } from "@/lib/security/requestLimits";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { canUseBrainStudio } from "./pilot";
import { libraryRequestSchema, clearRequestSchema } from "./operations";
import { normalizeBrainProfile } from "@/lib/workspaces/brainProfile";
import type { WorkspaceBrainProfile } from "@/lib/workspaces/brainTypes";

const headers = { "Cache-Control": "no-store", Vary: "Authorization", "X-Content-Type-Options": "nosniff" };
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });
export async function flushStudioFiles(userId: string, workspaceId: string, paths: unknown): Promise<boolean> {
  if (!Array.isArray(paths)) return false;
  const prefix = `${userId}/workspace-assets/${workspaceId}/`;
  const safe = paths.filter((path): path is string => typeof path === "string" && path.startsWith(prefix) && !path.split("/").includes(".."));
  if (safe.length !== paths.length) return true;
  const admin = getSupabaseAdmin();
  for (let offset = 0; offset < Math.min(safe.length, 200); offset += 100) {
    const batch = safe.slice(offset, offset + 100);
    try {
      const removed = await admin.storage.from("generations").remove(batch);
      if (removed.error) return true;
      const acknowledged = await admin.from("brain_retention_files").delete().in("path", batch);
      if (acknowledged.error) return true;
    } catch { return true; }
  }
  return safe.length > 200;
}
export async function handleStudioLibrary(req: Request, clear = false) {
  try {
    if (!supabaseServerConfigured()) return reply({ error: "unavailable" }, 503);
    const user = await getUserFromToken(req.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1] || null);
    if (!user) return reply({ error: "unauthorized" }, 401);
    if (!canUseBrainStudio(user)) return reply({ error: "not_found" }, 404);
    let workspaceId: string;
    let input: unknown;
    if (req.method === "GET" && !clear) {
      workspaceId = new URL(req.url).searchParams.get("workspaceId")?.trim() || "";
      if (!workspaceId || workspaceId.length > 160) return reply({ error: "invalid_request" }, 400);
    } else {
      const body = await readJsonBody(req, clear ? 512_000 : 16_000);
      if (!body.ok) { Object.entries(headers).forEach(([key, value]) => body.response.headers.set(key, value)); return body.response; }
      const parsed = clear ? clearRequestSchema.safeParse(body.body) : libraryRequestSchema.safeParse(body.body);
      if (!parsed.success) return reply({ error: "invalid_request" }, 400);
      input = parsed.data; workspaceId = parsed.data.workspaceId;
    }
    const admin = getSupabaseAdmin();
    const workspace = await admin.from("workspaces").select("id,brain_profile,brand_name,brand_logo_url").eq("id", workspaceId).eq("owner_id", user.id).maybeSingle();
    if (workspace.error) return reply({ error: "unavailable" }, 503);
    if (!workspace.data) return reply({ error: "workspace_not_found" }, 404);
    const policy = await requireBrainAccess(user.id, workspaceId);
    const rate = await checkRateLimit(`brain-studio:${clear ? "clear" : input ? "library-write" : "library-read"}`, user.id, clear ? 20 : input ? 180 : 120, 3600, "strict");
    if (!rate.allowed) return reply({ error: "rate_limited" }, 429);
    let cleanupPending = false;
    if (input) {
      const common = { p_user: user.id, p_workspace: workspaceId };
      const data = clear ? clearRequestSchema.parse(input) : libraryRequestSchema.parse(input);
      const discardUpload = async () => {
        if (!("operation" in data) || data.operation.action !== "add_source") return;
        // A failed attachment must not strand its just-uploaded object. The
        // locked RPC protects all current references and historical brand logos.
        try {
          const fresh = await requireBrainAccess(user.id, workspaceId);
          const discarded = await admin.rpc("maro_studio_library", { ...common, p_reset: fresh.brainResetAt, p_action: "discard_upload", p_payload: { storageRef: data.operation.storageRef } });
          if (!discarded.error) await flushStudioFiles(user.id, workspaceId, discarded.data?.paths);
        } catch { /* The existing retention sweep covers unreferenced workspace assets. */ }
      };
      if (data.resetAt !== policy.brainResetAt) { await discardUpload(); return reply({ error: "brain_refresh_required" }, 409); }
      if ("section" in data) {
        // Compare the editor's view without writing it first. Preserve the raw
        // database snapshot for the locked RPC's final compare-and-clear check.
        const current = normalizeBrainProfile(workspace.data.brain_profile as Partial<WorkspaceBrainProfile> | null);
        if (!current.brand.name && workspace.data.brand_name) current.brand.name = workspace.data.brand_name;
        if (!current.brand.logoUrl && workspace.data.brand_logo_url) current.brand.logoUrl = workspace.data.brand_logo_url;
        const ref = current.brand.logoStorageRef || (current.brand.logoUrl?.startsWith("storage:generations/") ? current.brand.logoUrl : null);
        if (ref) { current.brand.logoStorageRef = ref; current.brand.logoUrl = ref; }
        if (!isDeepStrictEqual(current, normalizeBrainProfile(data.expected as Partial<WorkspaceBrainProfile>))) return reply({ error: "brand_conflict" }, 409);
      }
      const result = "section" in data
        ? await admin.rpc("maro_studio_clear", { ...common, p_reset: data.resetAt, p_section: data.section, p_expected: workspace.data.brain_profile ?? null, p_sources: data.sourceIds })
        : await admin.rpc("maro_studio_library", { ...common, p_reset: data.resetAt, p_action: data.operation.action, p_payload: data.operation });
      if (result.error) {
        await discardUpload();
        const code = ["BRAIN_REFRESH_REQUIRED", "BRAND_CONFLICT", "SOURCE_CONFLICT", "BRAIN_PLAN_REQUIRED", "FOLDER_NOT_FOUND", "SOURCE_LIMIT", "INVALID_REQUEST", "PILOT_REQUIRED"].find(code => result.error.message.includes(code));
        return reply({ error: code?.toLowerCase() || "unavailable" }, code?.includes("CONFLICT") || code === "BRAIN_REFRESH_REQUIRED" ? 409 : code === "BRAIN_PLAN_REQUIRED" ? 403 : code === "INVALID_REQUEST" || code === "SOURCE_LIMIT" ? 422 : 503);
      }
      cleanupPending = await flushStudioFiles(user.id, workspaceId, result.data?.paths);
      cleanupPending = cleanupPending || Boolean(result.data?.cleanupPending);
      if (clear) return reply({ ok: true, cleanupPending });
    }
    const folders = await admin.from("maro_brain_folders").select("id,name").eq("workspace_id", workspaceId).eq("owner_id", user.id).order("created_at");
    if (folders.error) return reply({ error: "unavailable" }, 503);
    return reply({ folders: folders.data || [], cleanupPending });
  } catch (error) {
    if (error instanceof AccountPolicyError) return reply({ error: error.message }, error.status);
    return reply({ error: "unavailable" }, 503);
  }
}
