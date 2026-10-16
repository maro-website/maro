import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin, getUserFromToken, supabaseServerConfigured } from "@/lib/supabase/server";
import { AccountPolicyError, requireBrainAccess } from "@/lib/workspaces/accountPolicyServer";
import { readJsonBody } from "@/lib/security/requestLimits";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { canUseBrainStudio } from "./pilot";
import { memoryFromRow, memoryMetadataSchema, encodeMemoryCard, type BrainMemory } from "./memories";

const workspaceId = z.string().trim().min(1).max(160);
const saveSchema = z.object({ workspaceId, key: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,79}$/), content: z.string().trim().min(1).max(4000), metadata: memoryMetadataSchema, expectedRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER), resetAt: z.iso.datetime({ offset: true }).nullable() }).strict();
const headers = { "Cache-Control": "no-store", Vary: "Authorization", "X-Content-Type-Options": "nosniff" };
const response = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });

/** Existing table is capped at 2,000 revisions. Read both PostgREST pages, newest first. */
export async function loadStudioMemories(userId: string, id: string): Promise<BrainMemory[]> {
  const admin = getSupabaseAdmin(); const latest = new Map<string, BrainMemory>(); const seen = new Set<string>();
  for (let offset = 0; offset < 2000; offset += 1000) {
    const { data, error } = await admin.from("maro_brain_memories").select("memory_key,revision,content,source,created_at").eq("owner_id", userId).eq("workspace_id", id).order("revision", { ascending: false }).range(offset, offset + 999);
    if (error) throw new Error("memory_unavailable");
    for (const row of data ?? []) { if (seen.has(row.memory_key)) continue; seen.add(row.memory_key); const memory = memoryFromRow(row); if (memory) latest.set(memory.key, memory); }
    if ((data?.length ?? 0) < 1000) break;
  }
  return [...latest.values()];
}
export async function handleStudioMemories(req: Request) {
  try {
    if (!supabaseServerConfigured()) return response({ error: "unavailable" }, 503);
    const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1] ?? null;
    const user = await getUserFromToken(token);
    if (!user) return response({ error: "unauthorized" }, 401);
    if (!canUseBrainStudio(user)) return response({ error: "not_found" }, 404);
    let input: z.infer<typeof saveSchema> | null = null;
    let id: string;
    if (req.method === "GET") {
      const parsed = workspaceId.safeParse(new URL(req.url).searchParams.get("workspaceId"));
      if (!parsed.success) return response({ error: "invalid_request" }, 400);
      id = parsed.data;
    } else {
      const body = await readJsonBody(req, 12_000);
      if (!body.ok) { Object.entries(headers).forEach(([key, value]) => body.response.headers.set(key, value)); return body.response; }
      const parsed = saveSchema.safeParse(body.body);
      if (!parsed.success) return response({ error: "invalid_request" }, 400);
      input = parsed.data; id = input.workspaceId;
    }
    const { data: workspace, error } = await getSupabaseAdmin().from("workspaces").select("id").eq("id", id).eq("owner_id", user.id).maybeSingle();
    if (error) return response({ error: "unavailable" }, 503);
    if (!workspace) return response({ error: "workspace_not_found" }, 404);
    const policy = await requireBrainAccess(user.id, id);
    const rate = await checkRateLimit(`brain-studio:${input ? "write" : "read"}`, user.id, input ? 60 : 120, 3600, "strict");
    if (!rate.allowed) return response({ error: "rate_limited" }, 429);
    if (input) {
      if (policy.brainResetAt !== input.resetAt) return response({ error: "brain_refresh_required" }, 409);
      let content: string;
      try { content = encodeMemoryCard(input.content, input.metadata); } catch { return response({ error: "memory_too_long" }, 422); }
      const saved = await getSupabaseAdmin().rpc("maro_mcp_remember", { p_user: user.id, p_workspace: id, p_key: input.key, p_content: content, p_source: "Shkruar manualisht në maroBrain", p_expected: input.expectedRevision });
      if (saved.error) {
        const code = ["MEMORY_CONFLICT", "MEMORY_LIMIT", "BRAIN_REFRESH_REQUIRED", "BRAIN_PLAN_REQUIRED", "WORKSPACE_NOT_FOUND", "INVALID_REQUEST", "PILOT_REQUIRED"].find(value => saved.error.message.includes(value));
        return response({ error: code?.toLowerCase() ?? "unavailable" }, code === "MEMORY_CONFLICT" || code === "BRAIN_REFRESH_REQUIRED" ? 409 : code === "BRAIN_PLAN_REQUIRED" ? 403 : code === "MEMORY_LIMIT" ? 422 : 503);
      }
    }
    return response({ memories: await loadStudioMemories(user.id, id) });
  } catch (error) {
    if (error instanceof AccountPolicyError) return response({ error: error.message }, error.status);
    return response({ error: "unavailable" }, 503);
  }
}
