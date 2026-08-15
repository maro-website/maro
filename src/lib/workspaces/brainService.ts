"use client";

import type { WorkspaceBrainProfile, WorkspaceSource } from "@/lib/workspaces/brainTypes";
import { normalizeBrainProfile } from "@/lib/workspaces/brainProfile";
import { getSupabaseBrowser, supabaseConfigured, getAccessToken } from "@/lib/supabase/client";
import { uid } from "@/lib/utils/format";

const LOCAL_BRAIN_KEY = "maro:ws-brain";
const LOCAL_SOURCES_KEY = "maro:ws-sources";

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

export async function fetchBrainProfile(
  userId: string,
  workspaceId: string
): Promise<WorkspaceBrainProfile> {
  if (supabaseConfigured) {
    const supabase = getSupabaseBrowser();
    const { data } = await supabase
      .from("workspaces")
      .select("brain_profile, brand_name, brand_logo_url")
      .eq("id", workspaceId)
      .eq("owner_id", userId)
      .maybeSingle();
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
      return profile;
    }
  }
  return readLocalBrain(workspaceId);
}

export async function saveBrainProfile(
  userId: string,
  workspaceId: string,
  profile: WorkspaceBrainProfile
): Promise<void> {
  const normalized = normalizeBrainProfile(profile);
  writeLocalBrain(workspaceId, normalized);

  if (supabaseConfigured) {
    const supabase = getSupabaseBrowser();
    await supabase
      .from("workspaces")
      .update({
        brain_profile: normalized,
        brand_name: normalized.brand.name || null,
        brand_logo_url: normalized.brand.logoUrl,
      })
      .eq("id", workspaceId)
      .eq("owner_id", userId);
  }
}

export async function fetchWorkspaceSources(
  userId: string,
  workspaceId: string
): Promise<WorkspaceSource[]> {
  if (supabaseConfigured) {
    const supabase = getSupabaseBrowser();
    const { data } = await supabase
      .from("workspace_sources")
      .select("id, workspace_id, name, keywords, file_url, mime_type, created_at")
      .eq("workspace_id", workspaceId)
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });
    if (data) {
      return data.map((r) => ({
        id: r.id,
        workspaceId: r.workspace_id,
        name: r.name,
        keywords: r.keywords ?? "",
        fileUrl: r.file_url,
        mimeType: r.mime_type,
        createdAt: r.created_at,
      }));
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
    const { data, error } = await supabase
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
      .single();
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
    await supabase
      .from("workspace_sources")
      .delete()
      .eq("id", sourceId)
      .eq("workspace_id", workspaceId)
      .eq("owner_id", userId);
  }
  writeLocalSources(
    workspaceId,
    readLocalSources(workspaceId).filter((s) => s.id !== sourceId)
  );
}

/** Upload image data URL to storage; returns public URL or original data URL on fallback. */
export async function uploadSourceImage(dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith("data:image/")) return dataUrl;
  const token = await getAccessToken();
  if (!token) return dataUrl;
  try {
    const res = await fetch("/api/avatar", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ dataUrl }),
    });
    if (!res.ok) return dataUrl;
    const j = (await res.json()) as { url?: string };
    return j.url ?? dataUrl;
  } catch {
    return dataUrl;
  }
}
