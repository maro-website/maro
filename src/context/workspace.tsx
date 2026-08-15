"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useMaro } from "@/context/store";
import type { Workspace } from "@/lib/workspaces/types";
import { LOCAL_WORKSPACE_SCOPE } from "@/lib/storage/local";
import {
  createWorkspace,
  deleteWorkspace,
  fetchActiveWorkspaceId,
  fetchWorkspaces,
  setActiveWorkspaceId,
  updateWorkspace,
} from "@/lib/workspaces/service";

interface WorkspaceContextValue {
  ready: boolean;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (id: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<Workspace>;
  updateWorkspace: (id: string, patch: Partial<Pick<Workspace, "name" | "iconUrl">>) => Promise<Workspace | null>;
  deleteWorkspace: (id: string) => Promise<boolean>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user, ready: maroReady, setWorkspaceScope } = useMaro();
  const [ready, setReady] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const refreshWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setActiveId(null);
      setReady(true);
      return;
    }
    const [list, active] = await Promise.all([
      fetchWorkspaces(user.id),
      fetchActiveWorkspaceId(user.id),
    ]);
    setWorkspaces(list);
    const resolved = active && list.some((w) => w.id === active) ? active : list[0]?.id ?? null;
    setActiveId(resolved);
    if (resolved && resolved !== active) {
      await setActiveWorkspaceId(user.id, resolved);
    }
    setReady(true);
  }, [user]);

  useEffect(() => {
    if (!maroReady) return;
    if (!user) {
      setWorkspaceScope(LOCAL_WORKSPACE_SCOPE);
      return;
    }
    refreshWorkspaces();
  }, [maroReady, refreshWorkspaces, user, setWorkspaceScope]);

  useEffect(() => {
    if (!maroReady || !user || !activeId) return;
    setWorkspaceScope(activeId);
  }, [maroReady, user, activeId, setWorkspaceScope]);

  const setActiveWorkspace = useCallback(
    async (id: string) => {
      if (!user) return;
      setActiveId(id);
      await setActiveWorkspaceId(user.id, id);
    },
    [user]
  );

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeId) ?? workspaces[0] ?? null,
    [workspaces, activeId]
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      ready,
      workspaces,
      activeWorkspace,
      setActiveWorkspace,
      refreshWorkspaces,
      createWorkspace: async (name) => {
        if (!user) throw new Error("Not signed in");
        const ws = await createWorkspace(user.id, name);
        await refreshWorkspaces();
        return ws;
      },
      updateWorkspace: async (id, patch) => {
        if (!user) return null;
        const ws = await updateWorkspace(user.id, id, patch);
        await refreshWorkspaces();
        return ws;
      },
      deleteWorkspace: async (id) => {
        if (!user) return false;
        const ok = await deleteWorkspace(user.id, id);
        if (ok) await refreshWorkspaces();
        return ok;
      },
    }),
    [ready, workspaces, activeWorkspace, setActiveWorkspace, refreshWorkspaces, user]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
