import "server-only";
import { z } from "zod";
import { getActiveWorkspaceId, getSupabaseAdmin, getWorkspaceBrainProfile, getWorkspaceSources } from "@/lib/supabase/server";
import { requireBrainAccess } from "@/lib/workspaces/accountPolicyServer";
import { buildBrainBrief, isBrainConfigured } from "@/lib/workspaces/brainProfile";
import type { MaroMcpActor } from "./auth";
import { isBrainStudioOwner } from "@/lib/brain-studio/pilot";
import { loadStudioMemories } from "@/lib/brain-studio/server";
import { activeMemories, buildMemoryBrief, selectMemories, encodeMemoryCard, memoryFromRow } from "@/lib/brain-studio/memories";

const revision = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const key = z.string().min(1).max(80).regex(/^[a-z0-9][a-z0-9_-]*$/);
export const brainToolSchemas = {
  get_maro_brand: z.object({}).strict(),
  search_maro_brand_memory: z.object({ query: z.string().trim().max(400), limit: z.number().int().min(1).max(20).optional() }).strict(),
  save_maro_brand_memory: z.object({ key, content: z.string().trim().min(1).max(4000), source: z.string().trim().min(1).max(240), expected_revision: revision }).strict(),
  update_maro_brand: z.object({ section: z.enum(["brand","target","goal","market","content"]), field: z.string().min(1).max(40), value: z.string().max(4000), expected_revision: revision }).strict(),
  get_maro_brand_history: z.object({ key: key.optional(), before_revision: revision.optional(), limit: z.number().int().min(1).max(20).optional() }).strict(),
  delete_maro_brand_memory: z.object({ key, expected_revision: revision }).strict(),
};
export type BrainToolName = keyof typeof brainToolSchemas;

async function activeBrain(actor: MaroMcpActor) {
  const workspaceId = await getActiveWorkspaceId(actor.userId, { strict: true });
  if (!workspaceId) throw new Error("NO_ACTIVE_WORKSPACE");
  const policy = await requireBrainAccess(actor.userId, workspaceId);
  return { workspaceId, policy, admin: getSupabaseAdmin() };
}

export async function executeBrainTool(name: BrainToolName, actor: MaroMcpActor, raw: unknown): Promise<Record<string, unknown>> {
  const args = brainToolSchemas[name].parse(raw) as Record<string, unknown>;
  const { workspaceId, policy, admin } = await activeBrain(actor);
  if (name === "get_maro_brand") {
    const [profile, sources, version] = await Promise.all([
      getWorkspaceBrainProfile(actor.userId, workspaceId), getWorkspaceSources(actor.userId, workspaceId),
      admin.from("maro_brain_profile_versions").select("revision").eq("workspace_id", workspaceId).eq("owner_id", actor.userId).order("revision", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (!profile || version.error) throw new Error("SERVICE_UNAVAILABLE");
    // Only return user-owned brand content, never compiler/system prompts or private file paths.
    const { logoUrl: _logo, logoStorageRef: _ref, ...brand } = profile.brand;
    void _logo; void _ref;
    return { profile: { ...profile, brand }, configured: isBrainConfigured(profile, sources.length), revision: Number(version.data?.revision ?? 0),
      sources: sources.map(source => ({ name: source.name, keywords: source.keywords })), retention_delete_at: policy.brainDeleteAt };
  }
  if (name === "search_maro_brand_memory") {
    if (isBrainStudioOwner(actor.userId)) {
      const memories = activeMemories(await loadStudioMemories(actor.userId, workspaceId));
      const terms = String(args.query).toLocaleLowerCase().split(/\s+/).filter(Boolean);
      const found = memories.filter(memory => terms.every(term => `${memory.metadata.title} ${memory.content} ${memory.metadata.subject} ${memory.metadata.keywords}`.toLocaleLowerCase().includes(term))).slice(0, Number(args.limit ?? 10));
      const profile = await getWorkspaceBrainProfile(actor.userId, workspaceId);
      return { memories: found.map(memory => ({ key: memory.key, content: memory.content, source: memory.source, revision: memory.revision, created_at: memory.createdAt, metadata: memory.metadata })), brand_brief: [profile ? buildBrainBrief(profile) : "", buildMemoryBrief(selectMemories(memories, String(args.query)))].filter(Boolean).join("\n\n") };
    }
    const { data, error } = await admin.rpc("maro_mcp_search_memories", { p_user: actor.userId, p_workspace: workspaceId, p_query: args.query, p_limit: args.limit ?? 10 });
    if (error) throw new Error("SERVICE_UNAVAILABLE");
    const profile = await getWorkspaceBrainProfile(actor.userId, workspaceId);
    return { memories: data ?? [], brand_brief: profile ? buildBrainBrief(profile) : "" };
  }
  if (name === "get_maro_brand_history") {
    const memory = typeof args.key === "string";
    let query = admin.from(memory ? "maro_brain_memories" : "maro_brain_profile_versions")
      .select(memory ? "revision,memory_key,content,source,created_at" : "revision,profile,created_at")
      .eq("workspace_id", workspaceId).eq("owner_id", actor.userId).order("revision", { ascending: false }).limit(Number(args.limit ?? 10));
    if (memory) query = query.eq("memory_key", args.key);
    if (args.before_revision !== undefined) query = query.lt("revision", args.before_revision);
    const { data, error } = await query;
    if (error) throw new Error("SERVICE_UNAVAILABLE");
    const items = (data ?? []) as unknown as Record<string, unknown>[];
    // Logo object identities are not needed to explain a profile change.
    const history = items.map(item => {
      if (memory && isBrainStudioOwner(actor.userId)) {
        const card = memoryFromRow(item);
        if (card) return { ...item, content: card.content, metadata: card.metadata };
      }
      if (!item.profile || typeof item.profile !== "object") return item;
      const profile = item.profile as Record<string, unknown>;
      const brand = { ...(profile.brand as Record<string, unknown> ?? {}) };
      delete brand.logoUrl; delete brand.logoStorageRef;
      return { ...item, profile: { ...profile, brand } };
    });
    return { history, next_before_revision: history.length === Number(args.limit ?? 10) ? history.at(-1)?.revision : null };
  }
  const params = { p_user: actor.userId, p_workspace: workspaceId, p_expected: args.expected_revision };
  if (name === "save_maro_brand_memory" && isBrainStudioOwner(actor.userId)) {
    const existing = (await loadStudioMemories(actor.userId, workspaceId)).find(memory => memory.key === args.key);
    if (existing) {
      try { args.content = encodeMemoryCard(String(args.content), existing.metadata); }
      catch { throw new Error("INVALID_REQUEST"); }
    }
  }
  const operation = name === "save_maro_brand_memory" ? "maro_mcp_remember" : name === "delete_maro_brand_memory" ? "maro_mcp_forget" : "maro_mcp_update_brand";
  const payload = name === "save_maro_brand_memory" ? { ...params, p_key: args.key, p_content: args.content, p_source: args.source }
    : name === "delete_maro_brand_memory" ? { ...params, p_key: args.key }
    : { ...params, p_section: args.section, p_field: args.field, p_value: args.value };
  const { data, error } = await admin.rpc(operation, payload);
  if (error) {
    const code = ["MEMORY_CONFLICT","BRAND_CONFLICT","MEMORY_LIMIT","INVALID_REQUEST","BRAIN_PLAN_REQUIRED","WORKSPACE_NOT_FOUND"].find(code => error.message.includes(code));
    throw new Error(code ?? "SERVICE_UNAVAILABLE");
  }
  return data as Record<string, unknown>;
}
