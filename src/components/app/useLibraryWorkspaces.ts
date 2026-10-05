"use client";

import { useEffect, useRef, useState } from "react";
import { useMaro } from "@/context/store";
import { useWorkspace } from "@/context/workspace";
import { creationsKey, projectsKey, readJSON, writeJSON } from "@/lib/storage/local";
import { creationIdentityKeys, mergeServerCreations } from "@/lib/creations/mergeCreations";
import { creationAssetRef, withoutCreationAssets } from "@/lib/creations/creationAssets";
import { deleteMyCreation, deleteMyCreationAssets, fetchMyCreations, updateMyCreation } from "@/lib/services/creationsService";
import { notifyStorageChanged } from "@/lib/workspaces/accountPolicy";
import type { ImageCreation, Project } from "@/lib/types";

function sameCreation(a: ImageCreation, b: ImageCreation) {
  const keys = new Set(creationIdentityKeys(a));
  return creationIdentityKeys(b).some(key => keys.has(key));
}

/** Account-wide library data; browsing never changes the active composer scope. */
export function useLibraryWorkspaces(refresh: number) {
  const store = useMaro();
  const { workspaces } = useWorkspace();
  const userId = store.user?.id;
  const owner = useRef(userId);
  owner.current = userId;
  const [snapshot, setSnapshot] = useState<{ owner?: string; items: ImageCreation[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [, setCacheRevision] = useState(0);
  const workspaceIds = workspaces.filter(workspace => workspace.ownerId === userId).map(workspace => workspace.id);
  const workspaceKey = workspaceIds.join("\n");

  useEffect(() => {
    setSnapshot(null); setError(false); setLoading(false);
    if (!userId) return;
    const controller = new AbortController();
    setLoading(true);
    void fetchMyCreations(undefined, { workspace: "all", signal: controller.signal }).then(items => {
      if (controller.signal.aborted) return;
      if (items === null) setError(true);
      else setSnapshot({ owner: userId, items });
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [userId, refresh]);

  const data = (() => {
    const ids = workspaceKey ? workspaceKey.split("\n") : [];
    const server = snapshot && snapshot.owner === userId ? snapshot.items : null;
    const creations: ImageCreation[] = [];
    const projects: Project[] = [];
    for (const id of ids) {
      const local = id === store.activeWorkspaceScope ? store.creations : readJSON<ImageCreation[]>(creationsKey(id), []);
      const scoped = local.filter(item => !item.workspaceId || item.workspaceId === id).map(item => ({ ...item, workspaceId: id }));
      creations.push(...(server ? mergeServerCreations(scoped, server.filter(item => item.workspaceId === id), id) : scoped));
      const cached = id === store.activeWorkspaceScope ? store.projects : readJSON<Project[]>(projectsKey(id), []);
      projects.push(...cached.filter(item => !item.workspaceId || item.workspaceId === id).map(item => ({ ...item, workspaceId: id })));
    }
    if (server) creations.push(...server.filter(item => !item.workspaceId || !ids.includes(item.workspaceId)));
    if (!userId) return { creations: store.creations, projects: store.projects };
    return { creations, projects };
  })();

  function persistOtherCreation(target: ImageCreation, transform: (item: ImageCreation) => ImageCreation | null) {
    if (!target.workspaceId || !workspaceIds.includes(target.workspaceId) || target.workspaceId === store.activeWorkspaceScope) return;
    const key = creationsKey(target.workspaceId);
    writeJSON(key, readJSON<ImageCreation[]>(key, []).flatMap(item => {
      if (!sameCreation(item, target)) return [item];
      const updated = transform(item);
      return updated ? [updated] : [];
    }));
    setCacheRevision(value => value + 1);
  }
  function updateSnapshot(target: ImageCreation, transform: (item: ImageCreation) => ImageCreation | null) {
    setSnapshot(current => !current || current.owner !== userId ? current : { ...current, items: current.items.flatMap(item => {
      if (!sameCreation(item, target)) return [item];
      const updated = transform(item);
      return updated ? [updated] : [];
    }) });
    persistOtherCreation(target, transform);
  }

  function patchCreation(target: ImageCreation, patch: { title?: string; favourite?: boolean }) {
    const active = target.workspaceId === store.activeWorkspaceScope || !userId ? store.creations.find(item => sameCreation(item, target)) : undefined;
    if (active) {
      if (patch.title !== undefined) store.renameCreation(active.id, patch.title);
      if (patch.favourite !== undefined && Boolean(active.favourite) !== patch.favourite) store.toggleFavouriteCreation(active.id);
    } else void updateMyCreation(creationAssetRef(target, 0), patch, target.serverId);
    updateSnapshot(target, item => ({ ...item, ...patch }));
  }

  async function removeCreation(target: ImageCreation, refs: string[]) {
    const account = userId;
    const active = target.workspaceId === store.activeWorkspaceScope || !userId ? store.creations.find(item => sameCreation(item, target)) : undefined;
    if (active) {
      if (refs.length) await store.deleteCreationAssets(active.id, refs);
      else store.deleteCreation(active.id);
    } else if (refs.length && (target.serverId || refs.some(ref => !/^(data|blob):/.test(ref)))) {
      await deleteMyCreationAssets(refs, creationAssetRef(target, 0), target.serverId);
    } else if (!refs.length) await deleteMyCreation(creationAssetRef(target, 0), target.serverId);
    if (owner.current !== account) return;
    updateSnapshot(target, item => {
      if (!refs.length) return null;
      const next = withoutCreationAssets(item, new Set(refs));
      return next.urls.length || next.mediaType === "text" ? next : null;
    });
    notifyStorageChanged();
  }

  function changeProject(target: Project, patch: Partial<Pick<Project, "name" | "favourite">> | null) {
    if (target.workspaceId === store.activeWorkspaceScope || !userId) {
      if (!patch) store.deleteProject(target.id);
      else {
        if (patch.name !== undefined) store.renameProject(target.id, patch.name);
        if (patch.favourite !== undefined && Boolean(target.favourite) !== patch.favourite) store.toggleFavouriteProject(target.id);
      }
      return;
    }
    if (!target.workspaceId || !workspaceIds.includes(target.workspaceId)) return;
    const key = projectsKey(target.workspaceId);
    writeJSON(key, readJSON<Project[]>(key, []).flatMap(item => item.id !== target.id ? [item] : patch ? [{ ...item, ...patch, updatedAt: new Date().toISOString() }] : []));
    // Remove deleted projects from the captured list as well as the cache.
    setCacheRevision(value => value + 1);
    notifyStorageChanged();
  }

  return { creations: data.creations, projects: data.projects,
    loading, error, patchCreation, removeCreation, changeProject };
}
