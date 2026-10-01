import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { validatePromptContent } from "@/lib/admin/v1Configuration";
import { rowToSystemPrompt } from "./storage";
import type { EngineToolId, SystemPromptVersion } from "./types";

export async function listSystemPromptVersions(toolId: EngineToolId): Promise<SystemPromptVersion[]> {
  const { data } = await getSupabaseAdmin()
    .from("system_prompt_versions")
    .select("*")
    .eq("tool_id", toolId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((r) => rowToSystemPrompt(r as Record<string, unknown>));
}

export async function createDraftFromLive(
  toolId: EngineToolId,
  actorId: string,
  changeNote = "Draft created from live"
): Promise<SystemPromptVersion> {
  const admin = getSupabaseAdmin();
  const { data: live } = await admin
    .from("system_prompt_versions")
    .select("*")
    .eq("tool_id", toolId)
    .eq("status", "live")
    .maybeSingle();

  const content = live?.content ?? "";
  const nextVersion = `v${Date.now()}`;

  const { data, error } = await admin
    .from("system_prompt_versions")
    .insert({
      tool_id: toolId,
      version_label: nextVersion,
      status: "draft",
      content,
      change_note: changeNote,
      created_by: actorId,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToSystemPrompt(data as Record<string, unknown>);
}

export async function updateDraftContent(
  id: string,
  updates: { content?: string; changeNote?: string; status?: "draft" | "review" }
): Promise<SystemPromptVersion> {
  const admin = getSupabaseAdmin();
  const { data: current } = await admin.from("system_prompt_versions").select("*").eq("id", id).maybeSingle();
  if (!current) throw new Error("not_found");
  if (!["draft", "review"].includes(current.status)) throw new Error("cannot_edit_published_version");
  if (updates.content !== undefined) validatePromptContent(updates.content);

  if (updates.status !== undefined && !["draft", "review"].includes(updates.status)) throw new Error("invalid_draft_status");
  if (updates.changeNote !== undefined && (typeof updates.changeNote !== "string" || updates.changeNote.length > 2000)) throw new Error("invalid_change_note");
  const patch: Record<string, unknown> = {};
  if (updates.content != null) patch.content = updates.content;
  if (updates.changeNote != null) patch.change_note = updates.changeNote;
  if (updates.status != null) patch.status = updates.status;

  const { data, error } = await admin
    .from("system_prompt_versions")
    .update(patch)
    .in("status", ["draft", "review"])
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToSystemPrompt(data as Record<string, unknown>);
}

export async function publishSystemPromptVersion(
  id: string,
  actorId: string
): Promise<SystemPromptVersion> {
  const admin = getSupabaseAdmin();
  const { data: target } = await admin.from("system_prompt_versions").select("*").eq("id", id).maybeSingle();
  if (!target) throw new Error("not_found");
  if (target.status !== "draft" && target.status !== "review") {
    throw new Error("invalid_status_for_publish");
  }

  validatePromptContent(target.content);
  if (["maro_imazh", "maro_logo"].includes(target.tool_id)) {
    const { data, error } = await admin.rpc("admin_publish_v1_prompt", { p_id: id, p_actor: actorId });
    if (error) throw new Error("prompt_publish_failed");
    return rowToSystemPrompt(data as Record<string, unknown>);
  }
  const toolId = target.tool_id as EngineToolId;
  const now = new Date().toISOString();

  const { data: previousLive } = await admin
    .from("system_prompt_versions")
    .select("*")
    .eq("tool_id", toolId)
    .eq("status", "live")
    .maybeSingle();

  if (previousLive) {
    await admin
      .from("system_prompt_versions")
      .update({ status: "archived" })
      .eq("id", previousLive.id);
  }

  const { data, error } = await admin
    .from("system_prompt_versions")
    .update({
      status: "live",
      published_by: actorId,
      published_at: now,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToSystemPrompt(data as Record<string, unknown>);
}

export async function rollbackSystemPromptVersion(
  id: string,
  actorId: string
): Promise<SystemPromptVersion> {
  const admin = getSupabaseAdmin();
  const { data: archived } = await admin.from("system_prompt_versions").select("*").eq("id", id).maybeSingle();
  if (!archived) throw new Error("not_found");
  if (archived.status !== "archived") throw new Error("rollback_requires_archived");

  validatePromptContent(archived.content);
  if (["maro_imazh", "maro_logo"].includes(archived.tool_id)) {
    const { data, error } = await admin.rpc("admin_publish_v1_prompt", { p_id: id, p_actor: actorId, p_rollback: true });
    if (error) throw new Error("prompt_publish_failed");
    return rowToSystemPrompt(data as Record<string, unknown>);
  }
  const toolId = archived.tool_id as EngineToolId;
  const { data: live } = await admin
    .from("system_prompt_versions")
    .select("*")
    .eq("tool_id", toolId)
    .eq("status", "live")
    .maybeSingle();

  if (live) {
    await admin.from("system_prompt_versions").update({ status: "archived" }).eq("id", live.id);
  }

  const { data, error } = await admin
    .from("system_prompt_versions")
    .update({
      status: "live",
      published_by: actorId,
      published_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToSystemPrompt(data as Record<string, unknown>);
}
