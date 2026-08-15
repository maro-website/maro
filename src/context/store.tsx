"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import type { ImageCreation, Project, User } from "@/lib/types";
import type { Profile } from "@/lib/supabase/types";
import { StorageKeys, readJSON, writeJSON, projectsKey, creationsKey, LOCAL_WORKSPACE_SCOPE } from "@/lib/storage/local";
import { getSupabaseBrowser, supabaseConfigured } from "@/lib/supabase/client";
import {
  fetchMyCreations,
  updateMyCreation,
  deleteMyCreation,
} from "@/lib/services/creationsService";
import { uid } from "@/lib/utils/format";
import { prefetchPublicSettings } from "@/lib/settings/publicSettings";

interface MaroState {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  projects: Project[];
  creations: ImageCreation[];
  activeWorkspaceScope: string | null;
}

interface MaroContextValue {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  user: User | null;
  isAdmin: boolean;
  isCreator: boolean;
  /** True when the user's plan unlocks maroFort mode. */
  hasFort: boolean;
  /** True when user has purchased a maro plan (enables top-up). */
  hasMaroPlan: boolean;
  credits: number;
  supabaseReady: boolean;
  projects: Project[];
  // auth
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    name: string,
    email: string,
    password: string,
    turnstileToken?: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfileName: (name: string) => Promise<{ error: string | null }>;
  updateAvatar: (dataUrl: string) => Promise<{ error: string | null }>;
  getAccessToken: () => Promise<string | null>;
  // projects (localStorage)
  getProject: (id: string) => Project | undefined;
  addProject: (p: Project) => void;
  updateProject: (id: string, patch: Partial<Project> | ((p: Project) => Project)) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => Project | undefined;
  renameProject: (id: string, name: string) => void;
  toggleFavouriteProject: (id: string) => void;
  spendCredits: (amount: number) => void;
  // image creations (localStorage)
  creations: ImageCreation[];
  addCreation: (c: ImageCreation) => void;
  deleteCreation: (id: string) => void;
  renameCreation: (id: string, title: string) => void;
  toggleFavouriteCreation: (id: string) => void;
  setCreationReaction: (id: string, reaction: "like" | "dislike" | undefined) => void;
  /** Load/switch the active workspace slice for projects + creations. */
  setWorkspaceScope: (workspaceId: string | null) => void;
  activeWorkspaceScope: string | null;
}

const MaroContext = createContext<MaroContextValue | null>(null);

// Old Phase-1 seed project ids to purge from localStorage on first Beta load.
const LEGACY_SEED_IDS = new Set(["demo-nice", "demo-castello", "seed-dental", "seed-beton"]);

function profileToUser(profile: Profile | null): User | null {
  if (!profile) return null;
  return {
    id: profile.id,
    name: profile.full_name || profile.email.split("@")[0] || "Ti",
    email: profile.email,
    avatarColor: "#253FDA",
    plan: profile.plan === "fort" ? "fort" : "free",
    credits: profile.credits,
    createdAt: profile.created_at,
  };
}

export function MaroProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MaroState>({
    ready: false,
    session: null,
    profile: null,
    projects: [],
    creations: [],
    activeWorkspaceScope: null,
  });
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workspaceScopeRef = useRef<string | null>(null);
  const legacyMigratedRef = useRef(false);

  const loadScopedData = useCallback((workspaceId: string) => {
    let projects = readJSON<Project[]>(projectsKey(workspaceId), []);
    let creations = readJSON<ImageCreation[]>(creationsKey(workspaceId), []);

    if (!legacyMigratedRef.current) {
      const legacyProjects = readJSON<Project[]>(StorageKeys.projects, []);
      const legacyCreations = readJSON<ImageCreation[]>(StorageKeys.creations, []);
      if (projects.length === 0 && legacyProjects.length > 0) {
        projects = legacyProjects
          .filter((p) => !LEGACY_SEED_IDS.has(p.id))
          .map((p) => ({ ...p, workspaceId: p.workspaceId ?? workspaceId }));
        writeJSON(projectsKey(workspaceId), projects);
      }
      if (creations.length === 0 && legacyCreations.length > 0) {
        creations = legacyCreations.map((c) => ({
          ...c,
          workspaceId: c.workspaceId ?? workspaceId,
        }));
        writeJSON(creationsKey(workspaceId), creations);
      }
      legacyMigratedRef.current = true;
    } else {
      projects = projects.filter((p) => !LEGACY_SEED_IDS.has(p.id));
    }

    return { projects, creations };
  }, []);

  const syncServerCreations = useCallback(
    (scopeId: string) => {
      void fetchMyCreations().then((server) => {
        if (server.length === 0) return;
        setState((s) => {
          if (workspaceScopeRef.current !== scopeId) return s;
          const byUrl = new Map<string, ImageCreation>();
          for (const c of s.creations) {
            const u = c.urls?.[0];
            if (u) byUrl.set(u, c);
          }
          const merged = s.creations.map((c) => {
            const u = c.urls?.[0];
            const srv = u ? server.find((x) => x.urls?.[0] === u) : undefined;
            return srv ? { ...c, favourite: srv.favourite, title: srv.title ?? c.title } : c;
          });
          const additions = server
            .filter((srv) => {
              const u = srv.urls?.[0];
              return u && !byUrl.has(u);
            })
            .map((srv) => ({ ...srv, workspaceId: srv.workspaceId ?? scopeId }));
          const next = [...additions, ...merged].sort((a, b) =>
            (b.createdAt || "").localeCompare(a.createdAt || "")
          );
          writeJSON(creationsKey(scopeId), next);
          return { ...s, creations: next };
        });
      });
    },
    []
  );

  const setWorkspaceScope = useCallback(
    (workspaceId: string | null) => {
      const nextScope = workspaceId ?? LOCAL_WORKSPACE_SCOPE;
      const prevScope = workspaceScopeRef.current;
      if (prevScope === nextScope) return;

      setState((s) => {
        if (prevScope) {
          writeJSON(projectsKey(prevScope), s.projects);
          writeJSON(creationsKey(prevScope), s.creations);
        }
        workspaceScopeRef.current = nextScope;
        const { projects, creations } = loadScopedData(nextScope);
        return { ...s, projects, creations, activeWorkspaceScope: nextScope };
      });

      if (supabaseConfigured) syncServerCreations(nextScope);
    },
    [loadScopedData, syncServerCreations]
  );

  // ---- projects (workspace-scoped localStorage) ----
  const persistProjects = useCallback((projects: Project[]) => {
    const scopeId = workspaceScopeRef.current;
    if (!scopeId) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => writeJSON(projectsKey(scopeId), projects), 150);
  }, []);

  const setProjects = useCallback(
    (updater: (prev: Project[]) => Project[]) => {
      setState((s) => {
        const projects = updater(s.projects);
        persistProjects(projects);
        return { ...s, projects };
      });
    },
    [persistProjects]
  );

  // ---- auth / profile ----
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    if (!supabaseConfigured) return null;
    const sb = getSupabaseBrowser();
    // select("*") so newly-added columns (e.g. is_creator) don't break login
    // before the migration has run.
    const { data } = await sb.from("profiles").select("*").eq("id", userId).single();
    return (data as Profile) ?? null;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!supabaseConfigured) return;
    const sb = getSupabaseBrowser();
    const { data } = await sb.auth.getUser();
    const u = data.user;
    if (!u) {
      setState((s) => ({ ...s, profile: null }));
      return;
    }
    const profile = await fetchProfile(u.id);
    setState((s) => ({ ...s, profile }));
  }, [fetchProfile]);

  useEffect(() => {
    if (!supabaseConfigured) {
      setState((s) => ({ ...s, ready: true }));
      return;
    }
    const sb = getSupabaseBrowser();
    let unsub: (() => void) | undefined;

    (async () => {
      const { data } = await sb.auth.getSession();
      const session = data.session;
      const profile = session?.user ? await fetchProfile(session.user.id) : null;
      setState((s) => ({ ...s, ready: true, session, profile }));
      void prefetchPublicSettings(session?.access_token ?? null);

      const { data: sub } = sb.auth.onAuthStateChange(async (_event, newSession) => {
        const p = newSession?.user ? await fetchProfile(newSession.user.id) : null;
        setState((s) => ({ ...s, session: newSession, profile: p }));
        void prefetchPublicSettings(newSession?.access_token ?? null);
      });
      unsub = () => sub.subscription.unsubscribe();
    })();

    return () => unsub?.();
  }, [fetchProfile]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      if (!supabaseConfigured) return { error: "Supabase nuk është konfiguruar." };
      const sb = getSupabaseBrowser();
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      await refreshProfile();
      return { error: null };
    },
    [refreshProfile]
  );

  const signUp = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      turnstileToken?: string
    ): Promise<{ error: string | null }> => {
      if (!supabaseConfigured) return { error: "Supabase nuk është konfiguruar." };

      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, turnstileToken }),
        });
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          const map: Record<string, string> = {
            "disposable-email": "Email-et e përkohshme nuk lejohen.",
            "email-taken": "Ky email është i regjistruar tashmë.",
            turnstile_required: "Verifikimi CAPTCHA mungon.",
            turnstile_failed: "Verifikimi CAPTCHA dështoi. Provo përsëri.",
          };
          return { error: map[j.error ?? ""] ?? j.error ?? "Regjistrimi dështoi." };
        }
        return { error: null };
      } catch {
        return { error: "Regjistrimi dështoi. Provo përsëri." };
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    if (!supabaseConfigured) return;
    await getSupabaseBrowser().auth.signOut();
    setState((s) => ({ ...s, session: null, profile: null }));
  }, []);

  const updateProfileName = useCallback(
    async (name: string): Promise<{ error: string | null }> => {
      if (!supabaseConfigured) return { error: "Supabase nuk është konfiguruar." };
      const clean = name.trim();
      if (!clean) return { error: "Emri s'mund të jetë bosh." };
      const sb = getSupabaseBrowser();
      const { data } = await sb.auth.getUser();
      const u = data.user;
      if (!u) return { error: "Nuk je i kyçur." };
      // Optimistic update.
      setState((s) => (s.profile ? { ...s, profile: { ...s.profile, full_name: clean } } : s));
      const { error } = await sb.from("profiles").update({ full_name: clean }).eq("id", u.id);
      await sb.auth.updateUser({ data: { full_name: clean } }).catch(() => {});
      await refreshProfile();
      return { error: error?.message ?? null };
    },
    [refreshProfile]
  );

  const updateAvatar = useCallback(
    async (dataUrl: string): Promise<{ error: string | null }> => {
      if (!supabaseConfigured) return { error: "Supabase nuk është konfiguruar." };
      const sb = getSupabaseBrowser();
      const { data } = await sb.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return { error: "Nuk je i kyçur." };
      try {
        const res = await fetch("/api/avatar", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ dataUrl }),
        });
        const j = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
        if (!res.ok || !j.url) return { error: j.error ?? "upload-failed" };
        const { data: upd, error } = await sb.auth.updateUser({ data: { avatar_url: j.url } });
        if (error) return { error: error.message };
        // Reflect immediately in the session so the UI updates.
        setState((s) => (upd.user ? { ...s, session: { ...s.session!, user: upd.user } } : s));
        return { error: null };
      } catch {
        return { error: "upload-failed" };
      }
    },
    []
  );

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (!supabaseConfigured) return null;
    const { data } = await getSupabaseBrowser().auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  // Optimistic local credit decrement; the source of truth is the DB, so we
  // re-sync shortly after.
  const spendCredits = useCallback(
    (amount: number) => {
      setState((s) => {
        if (!s.profile) return s;
        return { ...s, profile: { ...s.profile, credits: Math.max(0, s.profile.credits - amount) } };
      });
      setTimeout(() => void refreshProfile(), 1200);
    },
    [refreshProfile]
  );

  // ---- project CRUD ----
  const getProject = useCallback(
    (id: string) => state.projects.find((p) => p.id === id),
    [state.projects]
  );

  const addProject = useCallback((p: Project) => setProjects((prev) => [p, ...prev]), [setProjects]);

  const updateProject = useCallback(
    (id: string, patch: Partial<Project> | ((p: Project) => Project)) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const next = typeof patch === "function" ? patch(p) : { ...p, ...patch };
          return { ...next, updatedAt: new Date().toISOString() };
        })
      );
    },
    [setProjects]
  );

  const deleteProject = useCallback(
    (id: string) => setProjects((prev) => prev.filter((p) => p.id !== id)),
    [setProjects]
  );

  const duplicateProject = useCallback(
    (id: string): Project | undefined => {
      const src = state.projects.find((p) => p.id === id);
      if (!src) return undefined;
      const copy: Project = {
        ...structuredClone(src),
        id: uid("proj"),
        name: `${src.name} (kopje)`,
        status: "draft",
        publishedUrl: undefined,
        workspaceId: src.workspaceId ?? workspaceScopeRef.current ?? undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setProjects((prev) => [copy, ...prev]);
      return copy;
    },
    [state.projects, setProjects]
  );

  const renameProject = useCallback(
    (id: string, name: string) => updateProject(id, { name }),
    [updateProject]
  );

  const toggleFavouriteProject = useCallback(
    (id: string) =>
      updateProject(id, (p) => ({ ...p, favourite: !p.favourite })),
    [updateProject]
  );

  // ---- image creations (workspace-scoped localStorage + server sync) ----
  const persistCreations = useCallback((creations: ImageCreation[]) => {
    const scopeId = workspaceScopeRef.current;
    if (!scopeId) return;
    writeJSON(creationsKey(scopeId), creations);
  }, []);

  const userId = state.session?.user?.id ?? null;
  useEffect(() => {
    if (!supabaseConfigured || !userId || !workspaceScopeRef.current) return;
    syncServerCreations(workspaceScopeRef.current);
  }, [userId, syncServerCreations]);

  const addCreation = useCallback(
    (c: ImageCreation) => {
      setState((s) => {
        const creations = [c, ...s.creations].slice(0, 100);
        persistCreations(creations);
        return { ...s, creations };
      });
    },
    [persistCreations]
  );

  const renameCreation = useCallback(
    (id: string, title: string) => {
      setState((s) => {
        const target = s.creations.find((c) => c.id === id);
        if (target) void updateMyCreation(target.urls?.[0], { title });
        const creations = s.creations.map((c) =>
          c.id === id ? { ...c, title } : c
        );
        persistCreations(creations);
        return { ...s, creations };
      });
    },
    [persistCreations]
  );

  const toggleFavouriteCreation = useCallback(
    (id: string) => {
      setState((s) => {
        const target = s.creations.find((c) => c.id === id);
        if (target) void updateMyCreation(target.urls?.[0], { favourite: !target.favourite });
        const creations = s.creations.map((c) =>
          c.id === id ? { ...c, favourite: !c.favourite } : c
        );
        persistCreations(creations);
        return { ...s, creations };
      });
    },
    [persistCreations]
  );

  const deleteCreation = useCallback(
    (id: string) => {
      setState((s) => {
        const target = s.creations.find((c) => c.id === id);
        if (target) void deleteMyCreation(target.urls?.[0]);
        const creations = s.creations.filter((c) => c.id !== id);
        persistCreations(creations);
        return { ...s, creations };
      });
    },
    [persistCreations]
  );

  const setCreationReaction = useCallback(
    (id: string, reaction: "like" | "dislike" | undefined) => {
      setState((s) => {
        const creations = s.creations.map((c) => (c.id === id ? { ...c, reaction } : c));
        persistCreations(creations);
        return { ...s, creations };
      });
    },
    [persistCreations]
  );

  const profile = state.profile;
  const avatarUrl =
    (state.session?.user?.user_metadata?.avatar_url as string | undefined) || undefined;
  const baseUser = profileToUser(profile);
  const user = baseUser ? { ...baseUser, avatarUrl } : null;
  const value = useMemo<MaroContextValue>(
    () => ({
      ready: state.ready,
      session: state.session,
      profile,
      user,
      isAdmin: Boolean(profile?.is_admin),
      isCreator: Boolean(profile?.is_creator),
      hasFort:
        profile?.plan === "fort" &&
        (!profile.fort_until || new Date(profile.fort_until) > new Date()),
      hasMaroPlan: Boolean(profile?.maro_plan),
      credits: profile?.credits ?? 0,
      supabaseReady: supabaseConfigured,
      projects: state.projects,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      updateProfileName,
      updateAvatar,
      getAccessToken,
      getProject,
      addProject,
      updateProject,
      deleteProject,
      duplicateProject,
      renameProject,
      toggleFavouriteProject,
      spendCredits,
      creations: state.creations,
      addCreation,
      deleteCreation,
      renameCreation,
      toggleFavouriteCreation,
      setCreationReaction,
      setWorkspaceScope,
      activeWorkspaceScope: state.activeWorkspaceScope,
    }),
    [
      state.ready,
      state.session,
      profile,
      user,
      state.projects,
      state.creations,
      state.activeWorkspaceScope,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      updateProfileName,
      updateAvatar,
      getAccessToken,
      getProject,
      addProject,
      updateProject,
      deleteProject,
      duplicateProject,
      renameProject,
      toggleFavouriteProject,
      spendCredits,
      addCreation,
      deleteCreation,
      renameCreation,
      toggleFavouriteCreation,
      setCreationReaction,
      setWorkspaceScope,
    ]
  );

  return <MaroContext.Provider value={value}>{children}</MaroContext.Provider>;
}

export function useMaro(): MaroContextValue {
  const ctx = useContext(MaroContext);
  if (!ctx) throw new Error("useMaro must be used within MaroProvider");
  return ctx;
}
