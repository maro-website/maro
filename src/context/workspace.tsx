"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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
import { DEFAULT_WORKSPACE_NAME } from "@/lib/workspaces/types";
import { workspaceErrorMessage } from "@/lib/workspaces/request";

interface WorkspaceContextValue {
  ready: boolean;
  error: string | null;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (id: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<Workspace>;
  updateWorkspace: (id: string, patch: Partial<Pick<Workspace, "name" | "iconUrl" | "brand">>) => Promise<Workspace | null>;
  deleteWorkspace: (id: string) => Promise<boolean>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user, ready: maroReady, setWorkspaceScope } = useMaro();
  const userId = user?.id;
  const ownerRef = useRef(userId);
  ownerRef.current = userId;
  const refreshVersion = useRef(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const refreshWorkspaces = useCallback(async () => {
    const version = ++refreshVersion.current;
    setError(null);
    if (!userId) {
      setWorkspaces([]);
      setActiveId(null);
      setReady(true);
      return;
    }
    try {
      const [list, active] = await Promise.all([
        fetchWorkspaces(userId),
        fetchActiveWorkspaceId(userId),
      ]);
      if (ownerRef.current !== userId || version !== refreshVersion.current) return;
      let resolvedList = list;
      if (!list.length) {
        const ws = await createWorkspace(userId, DEFAULT_WORKSPACE_NAME);
        resolvedList = [ws];
      }
      if (ownerRef.current !== userId || version !== refreshVersion.current) return;
      setWorkspaces(resolvedList);
      const resolved =
        active && resolvedList.some((w) => w.id === active)
          ? active
          : resolvedList[0]?.id ?? null;
      setActiveId(resolved);
      if (resolved && resolved !== active) {
        await setActiveWorkspaceId(userId, resolved);
      }
    } catch (cause) {
      if (ownerRef.current === userId && version === refreshVersion.current) {
        setError(workspaceErrorMessage(cause, "Workspace-et nuk u ngarkuan. Provo përsëri."));
      }
    } finally {
      if (ownerRef.current === userId && version === refreshVersion.current) setReady(true);
    }
  }, [userId]);

  useEffect(() => {
    if (!maroReady) return;
    setReady(false);
    setWorkspaces([]);
    setActiveId(null);
    if (!userId) setWorkspaceScope(LOCAL_WORKSPACE_SCOPE);
    void refreshWorkspaces();
    return () => { refreshVersion.current += 1; };
  }, [maroReady, refreshWorkspaces, userId, setWorkspaceScope]);

  useEffect(() => {
    if (!maroReady || !userId || !activeId) return;
    setWorkspaceScope(activeId);
  }, [maroReady, userId, activeId, setWorkspaceScope]);

  const setActiveWorkspace = useCallback(
    async (id: string) => {
      if (!userId) return;
      await setActiveWorkspaceId(userId, id);
      if (ownerRef.current === userId) setActiveId(id);
    },
    [userId]
  );

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.ownerId === userId && w.id === activeId)
      ?? workspaces.find((w) => w.ownerId === userId) ?? null,
    [workspaces, activeId, userId]
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      ready,
      error,
      workspaces: workspaces.filter((w) => w.ownerId === userId),
      activeWorkspace,
      setActiveWorkspace,
      refreshWorkspaces,
      createWorkspace: async (name) => {
        if (!userId) throw new Error("Not signed in");
        const ws = await createWorkspace(userId, name);
        if (ownerRef.current !== userId) throw new Error("workspace_changed");
        setWorkspaces((items) => [...items.filter((w) => w.id !== ws.id), ws]);
        return ws;
      },
      updateWorkspace: async (id, patch) => {
        if (!userId) throw new Error("Not signed in");
        const ws = await updateWorkspace(userId, id, patch);
        if (!ws) throw new Error("workspace_not_found");
        if (ownerRef.current !== userId) throw new Error("workspace_changed");
        setWorkspaces((items) => items.map((w) => w.id === id ? ws : w));
        return ws;
      },
      deleteWorkspace: async (id) => {
        if (!userId) return false;
        const ok = await deleteWorkspace(userId, id);
        if (ok) await refreshWorkspaces();
        return ok;
      },
    }),
    [ready, error, workspaces, activeWorkspace, setActiveWorkspace, refreshWorkspaces, userId]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
