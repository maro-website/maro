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
import { StorageKeys, readJSON, writeJSON } from "@/lib/storage/local";
import { getSupabaseBrowser, supabaseConfigured } from "@/lib/supabase/client";
import { uid } from "@/lib/utils/format";

interface MaroState {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  projects: Project[];
  creations: ImageCreation[];
}

interface MaroContextValue {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  user: User | null;
  isAdmin: boolean;
  credits: number;
  supabaseReady: boolean;
  projects: Project[];
  // auth
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (name: string, email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfileName: (name: string) => Promise<{ error: string | null }>;
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
    avatarColor: "#5a28e5",
    plan: "free",
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
  });
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- projects (localStorage) ----
  useEffect(() => {
    const stored = readJSON<Project[]>(StorageKeys.projects, []);
    // One-time cleanup: drop the old seeded demo projects from Phase 1 so the
    // Beta starts empty. Real user-created projects are kept.
    const projects = stored.filter((p) => !LEGACY_SEED_IDS.has(p.id));
    if (projects.length !== stored.length) writeJSON(StorageKeys.projects, projects);
    const creations = readJSON<ImageCreation[]>(StorageKeys.creations, []);
    setState((s) => ({ ...s, projects, creations }));
  }, []);

  const persistProjects = useCallback((projects: Project[]) => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => writeJSON(StorageKeys.projects, projects), 150);
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
    const { data } = await sb
      .from("profiles")
      .select("id, email, full_name, credits, is_admin, created_at")
      .eq("id", userId)
      .single();
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

      const { data: sub } = sb.auth.onAuthStateChange(async (_event, newSession) => {
        const p = newSession?.user ? await fetchProfile(newSession.user.id) : null;
        setState((s) => ({ ...s, session: newSession, profile: p }));
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
    async (name: string, email: string, password: string): Promise<{ error: string | null }> => {
      if (!supabaseConfigured) return { error: "Supabase nuk është konfiguruar." };
      const sb = getSupabaseBrowser();
      const { error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (error) return { error: error.message };
      // If email confirmation is disabled the user is signed in immediately.
      await refreshProfile();
      return { error: null };
    },
    [refreshProfile]
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

  // ---- image creations (localStorage) ----
  const persistCreations = useCallback((creations: ImageCreation[]) => {
    writeJSON(StorageKeys.creations, creations);
  }, []);

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
        const creations = s.creations.filter((c) => c.id !== id);
        persistCreations(creations);
        return { ...s, creations };
      });
    },
    [persistCreations]
  );

  const profile = state.profile;
  const value = useMemo<MaroContextValue>(
    () => ({
      ready: state.ready,
      session: state.session,
      profile,
      user: profileToUser(profile),
      isAdmin: Boolean(profile?.is_admin),
      credits: profile?.credits ?? 0,
      supabaseReady: supabaseConfigured,
      projects: state.projects,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      updateProfileName,
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
    }),
    [
      state.ready,
      state.session,
      profile,
      state.projects,
      state.creations,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      updateProfileName,
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
    ]
  );

  return <MaroContext.Provider value={value}>{children}</MaroContext.Provider>;
}

export function useMaro(): MaroContextValue {
  const ctx = useContext(MaroContext);
  if (!ctx) throw new Error("useMaro must be used within MaroProvider");
  return ctx;
}
