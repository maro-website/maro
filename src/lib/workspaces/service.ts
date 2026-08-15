import type { Workspace } from "@/lib/workspaces/types";
import { DEFAULT_WORKSPACE_NAME, MAX_WORKSPACES } from "@/lib/workspaces/types";
import { getSupabaseBrowser, supabaseConfigured } from "@/lib/supabase/client";
import { uid } from "@/lib/utils/format";

const LOCAL_KEY = "maro:workspaces";
const LOCAL_ACTIVE_KEY = "maro:activeWorkspace";

function readLocal(userId: string): Workspace[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_KEY}:${userId}`);
    return raw ? (JSON.parse(raw) as Workspace[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(userId: string, items: Workspace[]) {
  localStorage.setItem(`${LOCAL_KEY}:${userId}`, JSON.stringify(items));
}

function defaultWorkspace(userId: string): Workspace {
  return {
    id: uid("ws"),
    ownerId: userId,
    name: DEFAULT_WORKSPACE_NAME,
    iconUrl: null,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
  };
}

export async function fetchWorkspaces(userId: string): Promise<Workspace[]> {
  if (supabaseConfigured()) {
    const supabase = getSupabaseBrowser();
    const { data, error } = await supabase
      .from("workspaces")
      .select("id, owner_id, name, icon_url, sort_order, created_at")
      .eq("owner_id", userId)
      .order("sort_order", { ascending: true });

    if (!error && data?.length) {
      return data.map((r) => ({
        id: r.id,
        ownerId: r.owner_id,
        name: r.name,
        iconUrl: r.icon_url,
        sortOrder: r.sort_order ?? 0,
        createdAt: r.created_at,
      }));
    }
  }

  let local = readLocal(userId);
  if (!local.length) {
    local = [defaultWorkspace(userId)];
    writeLocal(userId, local);
  }
  return local;
}

export async function fetchActiveWorkspaceId(userId: string): Promise<string | null> {
  if (supabaseConfigured()) {
    const supabase = getSupabaseBrowser();
    const { data } = await supabase
      .from("profiles")
      .select("active_workspace_id")
      .eq("id", userId)
      .maybeSingle();
    if (data?.active_workspace_id) return data.active_workspace_id as string;
  }
  return localStorage.getItem(`${LOCAL_ACTIVE_KEY}:${userId}`);
}

export async function setActiveWorkspaceId(userId: string, workspaceId: string): Promise<void> {
  localStorage.setItem(`${LOCAL_ACTIVE_KEY}:${userId}`, workspaceId);
  if (supabaseConfigured()) {
    const supabase = getSupabaseBrowser();
    await supabase.from("profiles").update({ active_workspace_id: workspaceId }).eq("id", userId);
  }
}

export async function createWorkspace(userId: string, name: string): Promise<Workspace> {
  const existing = await fetchWorkspaces(userId);
  if (existing.length >= MAX_WORKSPACES) {
    throw new Error("WORKSPACE_LIMIT");
  }
  const ws: Workspace = {
    id: uid("ws"),
    ownerId: userId,
    name,
    iconUrl: null,
    sortOrder: existing.length,
    createdAt: new Date().toISOString(),
  };

  if (supabaseConfigured()) {
    const supabase = getSupabaseBrowser();
    const { data, error } = await supabase
      .from("workspaces")
      .insert({
        id: ws.id,
        owner_id: userId,
        name: ws.name,
        icon_url: null,
        sort_order: ws.sortOrder,
      })
      .select()
      .single();
    if (!error && data) {
      return {
        id: data.id,
        ownerId: data.owner_id,
        name: data.name,
        iconUrl: data.icon_url,
        sortOrder: data.sort_order ?? 0,
        createdAt: data.created_at,
      };
    }
  }

  const next = [...existing, ws];
  writeLocal(userId, next);
  return ws;
}

export async function updateWorkspace(
  userId: string,
  workspaceId: string,
  patch: Partial<Pick<Workspace, "name" | "iconUrl">>
): Promise<Workspace | null> {
  if (supabaseConfigured()) {
    const supabase = getSupabaseBrowser();
    const { data, error } = await supabase
      .from("workspaces")
      .update({
        name: patch.name,
        icon_url: patch.iconUrl,
      })
      .eq("id", workspaceId)
      .eq("owner_id", userId)
      .select()
      .single();
    if (!error && data) {
      return {
        id: data.id,
        ownerId: data.owner_id,
        name: data.name,
        iconUrl: data.icon_url,
        sortOrder: data.sort_order ?? 0,
        createdAt: data.created_at,
      };
    }
  }

  const items = readLocal(userId);
  const idx = items.findIndex((w) => w.id === workspaceId);
  if (idx < 0) return null;
  items[idx] = { ...items[idx], ...patch };
  writeLocal(userId, items);
  return items[idx];
}

export async function deleteWorkspace(userId: string, workspaceId: string): Promise<boolean> {
  const items = await fetchWorkspaces(userId);
  if (items.length <= 1) return false;

  if (supabaseConfigured()) {
    const supabase = getSupabaseBrowser();
    const { error } = await supabase
      .from("workspaces")
      .delete()
      .eq("id", workspaceId)
      .eq("owner_id", userId);
    if (error) return false;
  } else {
    writeLocal(
      userId,
      items.filter((w) => w.id !== workspaceId)
    );
  }
  return true;
}
