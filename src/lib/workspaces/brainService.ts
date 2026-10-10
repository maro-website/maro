"use client";
import { rateLimitedFetch as fetch } from "@/lib/client/rateLimit";

import type { WorkspaceBrainProfile, WorkspaceSource } from "@/lib/workspaces/brainTypes";
import { emptyBrainProfile } from "@/lib/workspaces/brainTypes";
import { hasSavedBrainProfile, normalizeBrainProfile } from "@/lib/workspaces/brainProfile";
import { getSupabaseBrowser, supabaseConfigured, getAccessToken } from "@/lib/supabase/client";
import { uid } from "@/lib/utils/format";
import { resolvePrivateAssetRefs } from "@/lib/services/projectAssetService";
import { workspaceRequest } from "./request";
import { fetchAccountPolicy } from "./accountPolicyClient";
import { notifyStorageChanged } from "./accountPolicy";

const LOCAL_BRAIN_KEY = "maro:ws-brain";
const LOCAL_SOURCES_KEY = "maro:ws-sources";
const pendingSaves = new Map<string, Promise<void>>();

function readLocalBrain(workspaceId: string): WorkspaceBrainProfile {
  if (typeof window === "undefined") return normalizeBrainProfile(null);
  try {
    const raw = localStorage.getItem(`${LOCAL_BRAIN_KEY}:${workspaceId}`);
    return normalizeBrainProfile(raw ? (JSON.parse(raw) as WorkspaceBrainProfile) : null);
  } catch {
    return normalizeBrainProfile(null);
  }
}

function writeLocalBrain(workspaceId: string, profile: WorkspaceBrainProfile) {
  localStorage.setItem(`${LOCAL_BRAIN_KEY}:${workspaceId}`, JSON.stringify(profile));
}

function readLocalSources(workspaceId: string): WorkspaceSource[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_SOURCES_KEY}:${workspaceId}`);
    return raw ? (JSON.parse(raw) as WorkspaceSource[]) : [];
  } catch {
    return [];
  }
}

function writeLocalSources(workspaceId: string, items: WorkspaceSource[]) {
  localStorage.setItem(`${LOCAL_SOURCES_KEY}:${workspaceId}`, JSON.stringify(items));
}

/** Read creation state even while a saved Brain is paused by the plan policy. */
export async function fetchBrainCreated(userId: string, workspaceId: string): Promise<boolean> {
  await pendingSaves.get(`${userId}:${workspaceId}`)?.catch(() => {});
  if (supabaseConfigured) {
    const supabase = getSupabaseBrowser();
    const { data, error } = await workspaceRequest(signal => supabase.from("workspaces")
      .select("brain_profile, brand_name, brand_logo_url").eq("id", workspaceId).eq("owner_id", userId).abortSignal(signal).maybeSingle());
    if (error) throw new Error(error.message);
    if (!data) throw new Error("workspace_not_found");
    return hasSavedBrainProfile(data.brain_profile, data.brand_name, data.brand_logo_url);
  }
  const raw = localStorage.getItem(`${LOCAL_BRAIN_KEY}:${workspaceId}`);
  return hasSavedBrainProfile(raw ? JSON.parse(raw) : null);
}

export async function fetchBrainProfile(
  userId: string,
  workspaceId: string
): Promise<WorkspaceBrainProfile> {
  // Navigation to a tool must observe the autosave started when the editor unmounted.
  await pendingSaves.get(`${userId}:${workspaceId}`)?.catch(() => {});
  if (supabaseConfigured) {
    const policy = await fetchAccountPolicy(userId, workspaceId);
    if (!policy.brainAccess) throw new Error("brain_plan_required");
    const supabase = getSupabaseBrowser();
    const { data, error } = await workspaceRequest((signal) => supabase
      .from("workspaces")
      .select("brain_profile, brand_name, brand_logo_url")
      .eq("id", workspaceId)
      .eq("owner_id", userId)
      .abortSignal(signal).maybeSingle());
    if (error) throw new Error(error.message);
    if (!data) throw new Error("workspace_not_found");
    if (data) {
      const profile = normalizeBrainProfile(
        (data.brain_profile as WorkspaceBrainProfile | null) ?? null
      );
      if (!profile.brand.name && data.brand_name) {
        profile.brand.name = data.brand_name as string;
      }
      if (!profile.brand.logoUrl && data.brand_logo_url) {
        profile.brand.logoUrl = data.brand_logo_url as string;
      }
      const logoRef = profile.brand.logoStorageRef ||
        (profile.brand.logoUrl?.startsWith("storage:generations/") ? profile.brand.logoUrl : null);
      if (logoRef) {
        const resolved = await resolvePrivateAssetRefs([logoRef]);
        profile.brand.logoStorageRef = logoRef;
        profile.brand.logoUrl = resolved[logoRef] ?? profile.brand.logoUrl;
      }
      return profile;
    }
  }
  return readLocalBrain(workspaceId);
}

export async function saveBrainProfile(
  userId: string,
  workspaceId: string,
  profile: WorkspaceBrainProfile,
  expectedResetAt?: string | null
): Promise<void> {
  return queueBrainSave(userId, workspaceId, profile, expectedResetAt);
}

/** An explicit creation must not overwrite a Brain saved by another open tab. */
export async function createBrainProfile(userId: string, workspaceId: string, expectedResetAt: string | null): Promise<void> {
  await queueBrainSave(userId, workspaceId, emptyBrainProfile(), expectedResetAt, true);
  if (!await fetchBrainCreated(userId, workspaceId)) throw new Error("brain_refresh_required");
}

function queueBrainSave(userId: string, workspaceId: string, profile: WorkspaceBrainProfile, expectedResetAt?: string | null, createOnly = false): Promise<void> {
  const key = `${userId}:${workspaceId}`;
  const previous = pendingSaves.get(key) ?? Promise.resolve();
  const task = previous.catch(() => {}).then(() => persistBrainProfile(userId, workspaceId, profile, expectedResetAt, createOnly));
  pendingSaves.set(key, task);
  const cleanup = () => { if (pendingSaves.get(key) === task) pendingSaves.delete(key); };
  void task.then(cleanup, cleanup);
  return task;
}

async function persistBrainProfile(
  userId: string,
  workspaceId: string,
  profile: WorkspaceBrainProfile,
  expectedResetAt?: string | null,
  createOnly = false
): Promise<void> {
  const normalized = normalizeBrainProfile(profile);
  const persisted = normalizeBrainProfile({
    ...normalized,
    brand: {
      ...normalized.brand,
      logoUrl: normalized.brand.logoStorageRef ?? normalized.brand.logoUrl,
    },
  });
  if (supabaseConfigured) {
    const supabase = getSupabaseBrowser();
    const { data, error } = await workspaceRequest((signal) => {
      let query = supabase
      .from("workspaces")
      .update({
        brain_profile: persisted,
        brand_name: normalized.brand.name || null,
        brand_logo_url: persisted.brand.logoUrl,
      })
      .eq("id", workspaceId)
      .eq("owner_id", userId);
      if (createOnly) query = query.eq("brain_profile", "{}");
      if (expectedResetAt !== undefined) query = expectedResetAt === null
        ? query.is("brain_reset_at", null) : query.eq("brain_reset_at", expectedResetAt);
      const returning = query.select("id").abortSignal(signal);
      return createOnly ? returning.maybeSingle() : returning.single();
    });
    if (error) throw new Error(expectedResetAt !== undefined && error.code === "PGRST116" ? "brain_refresh_required" : error.message);
    if (!data && !createOnly) throw new Error("workspace_not_found");
    return;
  }
  const existing = createOnly ? localStorage.getItem(`${LOCAL_BRAIN_KEY}:${workspaceId}`) : null;
  if (!createOnly || !hasSavedBrainProfile(existing ? JSON.parse(existing) : null)) writeLocalBrain(workspaceId, persisted);
}

export async function fetchWorkspaceSources(
  userId: string,
  workspaceId: string
): Promise<WorkspaceSource[]> {
  if (supabaseConfigured) {
    const supabase = getSupabaseBrowser();
    const { data, error } = await workspaceRequest((signal) => supabase
      .from("workspace_sources")
      .select("id, workspace_id, name, keywords, file_url, mime_type, created_at")
      .eq("workspace_id", workspaceId)
      .eq("owner_id", userId)
      .order("created_at", { ascending: false }).abortSignal(signal));
    if (error) throw new Error(error.message);
    if (data) {
      const items = data.map((r) => ({
        id: r.id,
        workspaceId: r.workspace_id,
        name: r.name,
        keywords: r.keywords ?? "",
        fileUrl: r.file_url,
        storageRef: typeof r.file_url === "string" && r.file_url.startsWith("storage:generations/")
          ? r.file_url
          : undefined,
        mimeType: r.mime_type,
        createdAt: r.created_at,
      }));
      const refs = items.map((item) => item.storageRef).filter((value): value is string => Boolean(value));
      const resolved = await resolvePrivateAssetRefs(refs);
      return items.map((item) => item.storageRef && resolved[item.storageRef]
        ? { ...item, fileUrl: resolved[item.storageRef] }
        : item);
    }
  }
  return readLocalSources(workspaceId);
}

export async function addWorkspaceSource(input: {
  userId: string;
  workspaceId: string;
  name: string;
  keywords: string;
  fileUrl: string;
  mimeType?: string;
}): Promise<WorkspaceSource> {
  const item: WorkspaceSource = {
    id: uid("src"),
    workspaceId: input.workspaceId,
    name: input.name.trim(),
    keywords: input.keywords.trim(),
    fileUrl: input.fileUrl,
    mimeType: input.mimeType ?? null,
    createdAt: new Date().toISOString(),
  };

  if (supabaseConfigured) {
    const supabase = getSupabaseBrowser();
    const { data, error } = await workspaceRequest((signal) => supabase
      .from("workspace_sources")
      .insert({
        id: item.id,
        workspace_id: input.workspaceId,
        owner_id: input.userId,
        name: item.name,
        keywords: item.keywords,
        file_url: item.fileUrl,
        mime_type: item.mimeType ?? null,
      })
      .select()
      .abortSignal(signal).single());
    if (error) throw new Error(error.message);
    if (!data) throw new Error("source_save_failed");
    if (!error && data) {
      return {
        id: data.id,
        workspaceId: data.workspace_id,
        name: data.name,
        keywords: data.keywords ?? "",
        fileUrl: data.file_url,
        mimeType: data.mime_type,
        createdAt: data.created_at,
      };
    }
  }

  const next = [item, ...readLocalSources(input.workspaceId)];
  writeLocalSources(input.workspaceId, next);
  return item;
}

export async function deleteWorkspaceSource(
  userId: string,
  workspaceId: string,
  sourceId: string
): Promise<void> {
  if (supabaseConfigured) {
    const supabase = getSupabaseBrowser();
    const { error } = await workspaceRequest((signal) => supabase
      .from("workspace_sources")
      .delete()
      .eq("id", sourceId)
      .eq("workspace_id", workspaceId)
      .eq("owner_id", userId).abortSignal(signal));
    if (error) throw new Error(error.message);
    return;
  }
  writeLocalSources(
    workspaceId,
    readLocalSources(workspaceId).filter((s) => s.id !== sourceId)
  );
}

/** Upload workspace media to private storage; the stable ref is persisted. */
export async function uploadSourceImage(
  dataUrl: string,
  workspaceId: string
): Promise<{ url: string; storageRef: string } | null> {
  if (!dataUrl.startsWith("data:image/")) return null;
  const token = await getAccessToken();
  if (!token) return null;
    const res = await fetch("/api/workspaces/assets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ dataUrl, workspaceId }),
    });
    const j = (await res.json()) as { url?: string; storageRef?: string; error?: string };
    if (!res.ok) throw new Error(j.error ?? "upload-failed");
    notifyStorageChanged();
    return j.url && j.storageRef ? { url: j.url, storageRef: j.storageRef } : null;
}
