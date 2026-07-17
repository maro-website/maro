"use client";

import * as React from "react";
import type {
  Project,
  Theme,
  WebsitePage,
  Asset,
  AssetCategory,
  SeoMeta,
  Version,
  ChatMessage,
  SectionKind,
} from "@/lib/types";
import type { EditTarget } from "@/components/website-previews/Editable";
import { useMaro } from "@/context/store";
import {
  interpretPrompt,
  requestAiEdit,
  InsufficientCreditsError,
  type AiEditResult,
} from "@/lib/services/aiEditService";
import { uid, slugify } from "@/lib/utils/format";

export type Device = "desktop" | "tablet" | "mobile";
export type RightTab = "design" | "content" | "assets" | "pages" | "versions" | "seo";
type SaveStatus = "saved" | "saving";

interface Snapshot {
  theme: Theme;
  pages: WebsitePage[];
  assets: Asset[];
  activePageId: string;
}

interface EditorContextValue {
  project: Project;
  device: Device;
  setDevice: (d: Device) => void;
  rightTab: RightTab;
  setRightTab: (t: RightTab) => void;
  selection: EditTarget | null;
  setSelection: (t: EditTarget | null) => void;
  saveStatus: SaveStatus;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  // mutations
  updateTheme: (patch: Partial<Theme>) => void;
  updateSectionField: (sectionId: string, field: string, value: string) => void;
  addSectionOfKind: (kind: SectionKind) => void;
  // pages
  setActivePage: (id: string) => void;
  addPage: (name: string, slug: string) => void;
  renamePage: (id: string, name: string) => void;
  duplicatePage: (id: string) => void;
  deletePage: (id: string) => void;
  // assets
  addAssets: (urls: string[], category: AssetCategory) => void;
  deleteAsset: (id: string) => void;
  // seo
  updateSeo: (pageId: string, patch: Partial<SeoMeta>) => void;
  // versions
  createVersion: (label: string) => void;
  restoreVersion: (id: string) => void;
  // ai
  sending: boolean;
  sendChat: (prompt: string) => void;
}

const EditorContext = React.createContext<EditorContextValue | null>(null);

function snapshot(p: Project): Snapshot {
  return {
    theme: structuredClone(p.theme),
    pages: structuredClone(p.pages),
    assets: structuredClone(p.assets),
    activePageId: p.activePageId,
  };
}

export function EditorProvider({
  project,
  children,
}: {
  project: Project;
  children: React.ReactNode;
}) {
  const { updateProject, spendCredits } = useMaro();

  const [device, setDevice] = React.useState<Device>("desktop");
  const [rightTab, setRightTab] = React.useState<RightTab>("design");
  const [selection, setSelectionState] = React.useState<EditTarget | null>(null);
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>("saved");
  const [past, setPast] = React.useState<Snapshot[]>([]);
  const [future, setFuture] = React.useState<Snapshot[]>([]);
  const [sending, setSending] = React.useState(false);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const projectRef = React.useRef(project);
  projectRef.current = project;

  const markSaving = React.useCallback(() => {
    setSaveStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaveStatus("saved"), 650);
  }, []);

  // Apply a mutation, recording history for undo/redo.
  const commit = React.useCallback(
    (mutate: (p: Project) => Project) => {
      const before = snapshot(projectRef.current);
      setPast((p) => [...p.slice(-40), before]);
      setFuture([]);
      updateProject(projectRef.current.id, (p) => mutate(p));
      markSaving();
    },
    [updateProject, markSaving]
  );

  const applySnapshot = React.useCallback(
    (snap: Snapshot) => {
      updateProject(projectRef.current.id, (p) => ({
        ...p,
        theme: snap.theme,
        pages: snap.pages,
        assets: snap.assets,
        activePageId: snap.activePageId,
      }));
      markSaving();
    },
    [updateProject, markSaving]
  );

  const undo = React.useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const prev = p[p.length - 1];
      setFuture((f) => [snapshot(projectRef.current), ...f]);
      applySnapshot(prev);
      return p.slice(0, -1);
    });
  }, [applySnapshot]);

  const redo = React.useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const nxt = f[0];
      setPast((p) => [...p, snapshot(projectRef.current)]);
      applySnapshot(nxt);
      return f.slice(1);
    });
  }, [applySnapshot]);

  const setSelection = React.useCallback((t: EditTarget | null) => {
    setSelectionState(t);
    if (t) setRightTab("content");
  }, []);

  // ---- theme ----
  const updateTheme = React.useCallback(
    (patch: Partial<Theme>) =>
      commit((p) => ({
        ...p,
        theme: { ...p.theme, ...patch },
        brand: {
          ...p.brand,
          primaryColor: patch.primaryColor ?? p.brand.primaryColor,
          secondaryColor: patch.secondaryColor ?? p.brand.secondaryColor,
          backgroundColor: patch.backgroundColor ?? p.brand.backgroundColor,
          textColor: patch.textColor ?? p.brand.textColor,
        },
      })),
    [commit]
  );

  // ---- content ----
  const updateSectionField = React.useCallback(
    (sectionId: string, field: string, value: string) =>
      commit((p) => ({
        ...p,
        pages: p.pages.map((pg) => ({
          ...pg,
          sections: pg.sections.map((s) =>
            s.id === sectionId ? { ...s, data: { ...s.data, [field]: value } } : s
          ),
        })),
      })),
    [commit]
  );

  const addSectionOfKind = React.useCallback(
    (kind: SectionKind) => {
      const r = interpretPrompt(kind === "pricing" ? "pricing" : kind);
      commit((p) => r.mutate(p));
    },
    [commit]
  );

  // ---- pages ----
  const setActivePage = React.useCallback(
    (id: string) => {
      updateProject(projectRef.current.id, (p) => ({ ...p, activePageId: id }));
      setSelectionState(null);
    },
    [updateProject]
  );

  const addPage = React.useCallback(
    (name: string, slug: string) =>
      commit((p) => {
        const page: WebsitePage = {
          id: uid("page"),
          name,
          slug: slugify(slug || name) || uid("p"),
          sections: [
            { id: uid("sec"), kind: "hero", data: { layout: "centered", title: name, subtitle: "Përmbajtja e kësaj faqeje.", ctaPrimary: "Kontakt", eyebrow: "" } },
            { id: uid("sec"), kind: "cta", data: { title: "Gati?", subtitle: "Na kontakto sot.", button: "Kontakt" } },
          ],
          seo: { title: `${name} · ${p.businessName}`, description: "", slug: slugify(slug || name) },
        };
        return { ...p, pages: [...p.pages, page], activePageId: page.id };
      }),
    [commit]
  );

  const renamePage = React.useCallback(
    (id: string, name: string) =>
      commit((p) => ({
        ...p,
        pages: p.pages.map((pg) => (pg.id === id ? { ...pg, name } : pg)),
      })),
    [commit]
  );

  const duplicatePage = React.useCallback(
    (id: string) =>
      commit((p) => {
        const src = p.pages.find((pg) => pg.id === id);
        if (!src) return p;
        const copy: WebsitePage = {
          ...structuredClone(src),
          id: uid("page"),
          name: `${src.name} (kopje)`,
          slug: `${src.slug}-copy`,
        };
        return { ...p, pages: [...p.pages, copy] };
      }),
    [commit]
  );

  const deletePage = React.useCallback(
    (id: string) =>
      commit((p) => {
        if (p.pages.length <= 1) return p;
        const pages = p.pages.filter((pg) => pg.id !== id);
        return { ...p, pages, activePageId: p.activePageId === id ? pages[0].id : p.activePageId };
      }),
    [commit]
  );

  // ---- assets ----
  const addAssets = React.useCallback(
    (urls: string[], category: AssetCategory) =>
      commit((p) => ({
        ...p,
        assets: [
          ...urls.map((url, i) => ({
            id: uid("as"),
            name: `upload-${p.assets.length + i + 1}.jpg`,
            url,
            category,
            createdAt: new Date().toISOString(),
          })),
          ...p.assets,
        ],
      })),
    [commit]
  );

  const deleteAsset = React.useCallback(
    (id: string) => commit((p) => ({ ...p, assets: p.assets.filter((a) => a.id !== id) })),
    [commit]
  );

  // ---- seo ----
  const updateSeo = React.useCallback(
    (pageId: string, patch: Partial<SeoMeta>) =>
      commit((p) => ({
        ...p,
        pages: p.pages.map((pg) => (pg.id === pageId ? { ...pg, seo: { ...pg.seo, ...patch } } : pg)),
      })),
    [commit]
  );

  // ---- versions ----
  const createVersion = React.useCallback(
    (label: string) =>
      updateProject(projectRef.current.id, (p) => {
        const v: Version = {
          id: uid("ver"),
          label,
          createdAt: new Date().toISOString(),
          snapshot: { theme: structuredClone(p.theme), pages: structuredClone(p.pages) },
        };
        return { ...p, versions: [...p.versions, v] };
      }),
    [updateProject]
  );

  const restoreVersion = React.useCallback(
    (id: string) =>
      commit((p) => {
        const v = p.versions.find((x) => x.id === id);
        if (!v) return p;
        return {
          ...p,
          theme: structuredClone(v.snapshot.theme),
          pages: structuredClone(v.snapshot.pages),
          activePageId: v.snapshot.pages[0]?.id ?? p.activePageId,
        };
      }),
    [commit]
  );

  // ---- AI chat ----
  const sendChat = React.useCallback(
    (prompt: string) => {
      if (!prompt.trim() || sending) return;
      const userMsg: ChatMessage = {
        id: uid("msg"),
        role: "user",
        content: prompt,
        status: "done",
        createdAt: new Date().toISOString(),
      };
      const thinkingId = uid("msg");
      const thinking: ChatMessage = {
        id: thinkingId,
        role: "assistant",
        content: "Maro është tu e ndreq...",
        status: "thinking",
        createdAt: new Date().toISOString(),
      };
      updateProject(projectRef.current.id, (p) => ({
        ...p,
        conversation: { ...p.conversation, messages: [...p.conversation.messages, userMsg, thinking] },
      }));
      setSending(true);

      const apply = (result: AiEditResult) => {
        const before = snapshot(projectRef.current);
        setPast((pp) => [...pp.slice(-40), before]);
        setFuture([]);
        updateProject(projectRef.current.id, (p) => {
          const mutated = result.mutate(p);
          const v: Version = {
            id: uid("ver"),
            label: result.versionLabel,
            createdAt: new Date().toISOString(),
            snapshot: { theme: structuredClone(mutated.theme), pages: structuredClone(mutated.pages) },
          };
          return {
            ...mutated,
            conversation: {
              ...mutated.conversation,
              messages: mutated.conversation.messages.map((m) =>
                m.id === thinkingId ? { ...m, content: result.response, status: "done" } : m
              ),
            },
            versions: [...mutated.versions, v],
            credits: [
              ...mutated.credits,
              { id: uid("ct"), label: result.versionLabel, amount: -result.cost, reason: "ai-edit", createdAt: new Date().toISOString() },
            ],
          };
        });
        spendCredits(result.cost);
        markSaving();
        setSending(false);
      };

      const showError = (text: string) => {
        updateProject(projectRef.current.id, (p) => ({
          ...p,
          conversation: {
            ...p.conversation,
            messages: p.conversation.messages.map((m) =>
              m.id === thinkingId ? { ...m, content: text, status: "done" } : m
            ),
          },
        }));
        setSending(false);
      };

      // Call the real model; fall back to the local interpreter on failures,
      // except for credit errors which must be surfaced (no free mock edit).
      requestAiEdit(prompt, projectRef.current)
        .then(apply)
        .catch((err) => {
          if (err instanceof InsufficientCreditsError) {
            showError(
              `Nuk ke kredite të mjaftueshme për këtë ndryshim (nevojiten ${err.needed}). Shto kredite për të vazhduar.`
            );
            return;
          }
          apply(interpretPrompt(prompt));
        });
    },
    [sending, updateProject, spendCredits, markSaving]
  );

  const value: EditorContextValue = {
    project,
    device,
    setDevice,
    rightTab,
    setRightTab,
    selection,
    setSelection,
    saveStatus,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    undo,
    redo,
    updateTheme,
    updateSectionField,
    addSectionOfKind,
    setActivePage,
    addPage,
    renamePage,
    duplicatePage,
    deletePage,
    addAssets,
    deleteAsset,
    updateSeo,
    createVersion,
    restoreVersion,
    sending,
    sendChat,
  };

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor() {
  const ctx = React.useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within EditorProvider");
  return ctx;
}
