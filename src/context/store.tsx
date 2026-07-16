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
import type { Project, User } from "@/lib/types";
import { StorageKeys, readJSON, writeJSON, clearAll } from "@/lib/storage/local";
import { seedProjects, makeNiceAgency, makeCastello } from "@/lib/mock/demo";
import { uid } from "@/lib/utils/format";

interface MaroState {
  ready: boolean;
  user: User | null;
  projects: Project[];
}

interface MaroContextValue extends MaroState {
  signIn: (email: string, name?: string) => User;
  signUp: (name: string, email: string) => User;
  signOut: () => void;
  resetDemoData: () => void;
  getProject: (id: string) => Project | undefined;
  addProject: (p: Project) => void;
  updateProject: (id: string, patch: Partial<Project> | ((p: Project) => Project)) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => Project | undefined;
  renameProject: (id: string, name: string) => void;
  spendCredits: (amount: number) => void;
  openDemoProject: () => Project;
}

const MaroContext = createContext<MaroContextValue | null>(null);

const AVATAR_COLORS = ["#5a28e5", "#0ea5b7", "#ea580c", "#12a150", "#8a5a2b"];

function defaultUser(name: string, email: string): User {
  return {
    id: uid("user"),
    name,
    email,
    avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    plan: "free",
    credits: 100,
    createdAt: new Date().toISOString(),
  };
}

export function MaroProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MaroState>({
    ready: false,
    user: null,
    projects: [],
  });
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate once on mount.
  useEffect(() => {
    const user = readJSON<User | null>(StorageKeys.session, null);
    const seeded = readJSON<boolean>(StorageKeys.seeded, false);
    let projects = readJSON<Project[]>(StorageKeys.projects, []);
    if (!seeded || projects.length === 0) {
      projects = seedProjects();
      writeJSON(StorageKeys.projects, projects);
      writeJSON(StorageKeys.seeded, true);
    }
    setState({ ready: true, user, projects });
  }, []);

  // Persist projects (debounced) whenever they change.
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

  const setUser = useCallback((user: User | null) => {
    writeJSON(StorageKeys.session, user);
    setState((s) => ({ ...s, user }));
  }, []);

  const signIn = useCallback(
    (email: string, name?: string) => {
      const u = defaultUser(name ?? email.split("@")[0] ?? "Ti", email || "ti@maro.al");
      setUser(u);
      return u;
    },
    [setUser]
  );

  const signUp = useCallback(
    (name: string, email: string) => {
      const u = defaultUser(name || "Ti", email || "ti@maro.al");
      setUser(u);
      return u;
    },
    [setUser]
  );

  const signOut = useCallback(() => setUser(null), [setUser]);

  const resetDemoData = useCallback(() => {
    clearAll();
    const projects = seedProjects();
    writeJSON(StorageKeys.projects, projects);
    writeJSON(StorageKeys.seeded, true);
    setState({ ready: true, user: null, projects });
  }, []);

  const getProject = useCallback(
    (id: string) => state.projects.find((p) => p.id === id),
    [state.projects]
  );

  const addProject = useCallback(
    (p: Project) => setProjects((prev) => [p, ...prev]),
    [setProjects]
  );

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

  const spendCredits = useCallback(
    (amount: number) => {
      setState((s) => {
        if (!s.user) return s;
        const user = { ...s.user, credits: Math.max(0, s.user.credits - amount) };
        writeJSON(StorageKeys.session, user);
        return { ...s, user };
      });
    },
    []
  );

  const openDemoProject = useCallback((): Project => {
    let demo = state.projects.find((p) => p.id === "demo-nice");
    if (!demo) {
      demo = makeNiceAgency();
      setProjects((prev) => [demo as Project, ...prev]);
    }
    // Ensure a signed-in session for the demo experience.
    if (!state.user) {
      setUser({ ...defaultUser("Demo User", "demo@maro.al"), credits: 45 });
    }
    return demo;
  }, [state.projects, state.user, setProjects, setUser]);

  // Guarantee both demo projects exist for the "Try Demo" experience.
  useEffect(() => {
    if (!state.ready) return;
    const hasNice = state.projects.some((p) => p.id === "demo-nice");
    const hasCastello = state.projects.some((p) => p.id === "demo-castello");
    if (!hasNice || !hasCastello) {
      setProjects((prev) => {
        const additions: Project[] = [];
        if (!prev.some((p) => p.id === "demo-castello")) additions.push(makeCastello());
        if (!prev.some((p) => p.id === "demo-nice")) additions.push(makeNiceAgency());
        return [...additions, ...prev];
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ready]);

  const value = useMemo<MaroContextValue>(
    () => ({
      ...state,
      signIn,
      signUp,
      signOut,
      resetDemoData,
      getProject,
      addProject,
      updateProject,
      deleteProject,
      duplicateProject,
      renameProject,
      spendCredits,
      openDemoProject,
    }),
    [
      state,
      signIn,
      signUp,
      signOut,
      resetDemoData,
      getProject,
      addProject,
      updateProject,
      deleteProject,
      duplicateProject,
      renameProject,
      spendCredits,
      openDemoProject,
    ]
  );

  return <MaroContext.Provider value={value}>{children}</MaroContext.Provider>;
}

export function useMaro(): MaroContextValue {
  const ctx = useContext(MaroContext);
  if (!ctx) throw new Error("useMaro must be used within MaroProvider");
  return ctx;
}
