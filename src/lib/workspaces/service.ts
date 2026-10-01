import { getSupabaseBrowser, supabaseConfigured } from "@/lib/supabase/client";
import type { Workspace, WorkspaceBrand } from "@/lib/workspaces/types";
import { DEFAULT_WORKSPACE_NAME, MAX_WORKSPACES } from "@/lib/workspaces/types";
import { normalizeWorkspaceBrand } from "@/lib/workspaces/brand";
import { uid } from "@/lib/utils/format";
import { workspaceRequest } from "./request";

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

function mapBrandRow(r: Record<string, unknown>): WorkspaceBrand {
  return normalizeWorkspaceBrand({
    name: (r.brand_name as string | undefined) ?? undefined,
    logoUrl: (r.brand_logo_url as string | undefined) ?? null,
    primaryColor: (r.brand_primary_color as string | undefined) ?? undefined,
    secondaryColor: (r.brand_secondary_color as string | undefined) ?? undefined,
    backgroundColor: (r.brand_background_color as string | undefined) ?? undefined,
    textColor: (r.brand_text_color as string | undefined) ?? undefined,
  });
}

function mapWorkspaceRow(r: Record<string, unknown>): Workspace {
  return {
    id: r.id as string,
    ownerId: r.owner_id as string,
    name: r.name as string,
    iconUrl: (r.icon_url as string | null) ?? null,
    sortOrder: (r.sort_order as number) ?? 0,
    createdAt: r.created_at as string,
    brand: mapBrandRow(r),
  };
}

function brandToDb(brand?: Partial<Workspace["brand"]>) {
  if (!brand) return {};
  const normalized = normalizeWorkspaceBrand(brand);
  return {
    brand_name: normalized.name ?? null,
    brand_logo_url: normalized.logoUrl ?? null,
    brand_primary_color: normalized.primaryColor,
    brand_secondary_color: normalized.secondaryColor,
    brand_background_color: normalized.backgroundColor,
    brand_text_color: normalized.textColor,
  };
}

function defaultWorkspace(userId: string): Workspace {
  return {
    id: uid("ws"),
    ownerId: userId,
    name: DEFAULT_WORKSPACE_NAME,
    iconUrl: null,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    brand: normalizeWorkspaceBrand({}),
  };
}

export async function fetchWorkspaces(userId: string): Promise<Workspace[]> {
  if (supabaseConfigured) {
    const supabase = getSupabaseBrowser();
    const { data, error } = await workspaceRequest((signal) => supabase
      .from("workspaces")
      .select(
        "id, owner_id, name, icon_url, sort_order, created_at, brand_name, brand_logo_url, brand_primary_color, brand_secondary_color, brand_background_color, brand_text_color"
      )
      .eq("owner_id", userId)
      .order("sort_order", { ascending: true }).abortSignal(signal));
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => mapWorkspaceRow(r as Record<string, unknown>));
  }
  const local = readLocal(userId);
  return local.length ? local : [];
}

export async function fetchActiveWorkspaceId(userId: string): Promise<string | null> {
  if (supabaseConfigured) {
    const supabase = getSupabaseBrowser();
    const { data, error } = await workspaceRequest((signal) => supabase
      .from("profiles")
      .select("active_workspace_id")
      .eq("id", userId)
      .abortSignal(signal).maybeSingle());
    if (error) throw new Error(error.message);
    return data?.active_workspace_id ?? null;
  }
  return localStorage.getItem(`${LOCAL_ACTIVE_KEY}:${userId}`);
}

export async function setActiveWorkspaceId(userId: string, workspaceId: string): Promise<void> {
  if (supabaseConfigured) {
    const supabase = getSupabaseBrowser();
    const { error } = await workspaceRequest((signal) => supabase.from("profiles")
      .update({ active_workspace_id: workspaceId }).eq("id", userId).select("id").abortSignal(signal).single());
    if (error) throw new Error(error.message);
  }
  if (!supabaseConfigured) localStorage.setItem(`${LOCAL_ACTIVE_KEY}:${userId}`, workspaceId);
}

export async function createWorkspace(userId: string, name: string): Promise<Workspace> {
  if (supabaseConfigured) {
    const supabase = getSupabaseBrowser();
    const { data: sessionData, error } = await workspaceRequest(() => supabase.auth.getSession());
    if (error) throw new Error(error.message);
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("unauthorized");

    const { res, payload } = await workspaceRequest(async (signal) => {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
        signal,
      });
      const payload = (await res.json()) as { workspace?: Record<string, unknown>; error?: string };
      return { res, payload };
    });

    if (!res.ok) {
      if (payload.error === "WORKSPACE_LIMIT") throw new Error("WORKSPACE_LIMIT");
      throw new Error(payload.error ?? "create_failed");
    }
    if (payload.workspace) {
      return mapWorkspaceRow(payload.workspace);
    }
    throw new Error("create_failed");
  }

  const existing = await fetchWorkspaces(userId);
  if (existing.length >= MAX_WORKSPACES) {
    throw new Error("WORKSPACE_LIMIT");
  }
  const ws = defaultWorkspace(userId);
  ws.name = name;
  ws.sortOrder = existing.length;
  const next = [...existing, ws];
  writeLocal(userId, next);
  return ws;
}

export async function updateWorkspace(
  userId: string,
  workspaceId: string,
  patch: Partial<Pick<Workspace, "name" | "iconUrl" | "brand">>
): Promise<Workspace | null> {
  if (supabaseConfigured) {
    const supabase = getSupabaseBrowser();
    const { data, error } = await workspaceRequest((signal) => supabase
      .from("workspaces")
      .update({
        ...(patch.name != null ? { name: patch.name } : {}),
        ...(patch.iconUrl !== undefined ? { icon_url: patch.iconUrl } : {}),
        ...brandToDb(patch.brand),
      })
      .eq("id", workspaceId)
      .eq("owner_id", userId)
      .select(
        "id, owner_id, name, icon_url, sort_order, created_at, brand_name, brand_logo_url, brand_primary_color, brand_secondary_color, brand_background_color, brand_text_color"
      )
      .abortSignal(signal).single());
    if (error) throw new Error(error.message);
    if (!data) throw new Error("workspace_not_found");
    return mapWorkspaceRow(data as Record<string, unknown>);
  }

  const items = readLocal(userId);
  const idx = items.findIndex((w) => w.id === workspaceId);
  if (idx < 0) return null;
  items[idx] = {
    ...items[idx],
    ...patch,
    brand: normalizeWorkspaceBrand({ ...items[idx].brand, ...patch.brand }),
  };
  writeLocal(userId, items);
  return items[idx];
}

export async function deleteWorkspace(userId: string, workspaceId: string): Promise<boolean> {
  if (supabaseConfigured) {
    const supabase = getSupabaseBrowser();
    const { error } = await workspaceRequest((signal) => supabase
      .from("workspaces")
      .delete()
      .eq("id", workspaceId)
      .eq("owner_id", userId).abortSignal(signal));
    if (error) throw new Error(error.message);
    return true;
  }

  const items = readLocal(userId).filter((w) => w.id !== workspaceId);
  writeLocal(userId, items);
  return true;
}
