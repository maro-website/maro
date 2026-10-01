"use client";

import * as React from "react";
import type {
  Project,
  Theme,
  WebsitePage,
  Asset,
  AssetCategory,
  SeoMeta,
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
import { requestHtmlEdit, htmlEditErrorMessage } from "@/lib/services/htmlEditService";
import { uid, slugify } from "@/lib/utils/format";
import {
  applyEditorSnapshot,
  addProjectVersion,
  createEditorSnapshot,
  replaceHtmlPageSource,
  restoreProjectVersion,
  type EditorSnapshot,
} from "@/lib/editor/projectEditing";
import {
  editHtmlElement,
  type HtmlElementPatch,
  type HtmlElementSelection,
} from "@/lib/editor/htmlVisualEditing";

export type Device = "desktop" | "tablet" | "mobile";
export type RightTab = "edit" | "code" | "design" | "content" | "assets" | "pages" | "versions" | "seo";
type SaveStatus = "saved" | "saving";

interface EditorContextValue {
  project: Project;
  device: Device;
  setDevice: (d: Device) => void;
  rightTab: RightTab;
  setRightTab: (t: RightTab) => void;
  selection: EditTarget | null;
  setSelection: (t: EditTarget | null) => void;
  htmlSelection: HtmlElementSelection | null;
  setHtmlSelection: (selection: HtmlElementSelection | null) => void;
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
  setActiveHtmlPage: (id: string) => void;
  updateHtmlPage: (id: string, html: string) => void;
  updateHtmlElement: (selection: HtmlElementSelection, patch: HtmlElementPatch) => void;
  // assets
  addAssets: (urls: string[], category: AssetCategory, storageRefs?: string[]) => void;
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

export function EditorProvider({
  project,
  children,
}: {
  project: Project;
  children: React.ReactNode;
}) {
  const { updateProject, spendCredits } = useMaro();

  const [device, setDevice] = React.useState<Device>("desktop");
  const [rightTab, setRightTab] = React.useState<RightTab>(
    project.renderMode === "html" ? "edit" : "design"
  );
  const [selection, setSelectionState] = React.useState<EditTarget | null>(null);
  const [htmlSelection, setHtmlSelectionState] = React.useState<HtmlElementSelection | null>(null);
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>("saved");
  const [past, setPast] = React.useState<EditorSnapshot[]>([]);
  const [future, setFuture] = React.useState<EditorSnapshot[]>([]);
  const [sending, setSending] = React.useState(false);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const htmlHistoryTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const htmlHistoryOpen = React.useRef(false);
  const htmlHistoryPageId = React.useRef<string | null>(null);

  const projectRef = React.useRef(project);
  projectRef.current = project;

  const markSaving = React.useCallback(() => {
    setSaveStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaveStatus("saved"), 650);
  }, []);

  const closeHtmlHistoryGroup = React.useCallback(() => {
    if (htmlHistoryTimer.current) clearTimeout(htmlHistoryTimer.current);
    htmlHistoryTimer.current = null;
    htmlHistoryOpen.current = false;
    htmlHistoryPageId.current = null;
  }, []);

  const recordHistory = React.useCallback(() => {
    const before = createEditorSnapshot(projectRef.current);
    setPast((items) => [...items.slice(-40), before]);
    setFuture([]);
  }, []);

  const beginHtmlHistoryGroup = React.useCallback(
    (pageId: string) => {
      if (!htmlHistoryOpen.current || htmlHistoryPageId.current !== pageId) {
        closeHtmlHistoryGroup();
        recordHistory();
        htmlHistoryOpen.current = true;
        htmlHistoryPageId.current = pageId;
      }
      if (htmlHistoryTimer.current) clearTimeout(htmlHistoryTimer.current);
      htmlHistoryTimer.current = setTimeout(closeHtmlHistoryGroup, 800);
    },
    [closeHtmlHistoryGroup, recordHistory]
  );

  React.useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (htmlHistoryTimer.current) clearTimeout(htmlHistoryTimer.current);
    },
    []
  );

  // Apply a mutation, recording history for undo/redo.
  const commit = React.useCallback(
    (mutate: (p: Project) => Project) => {
      closeHtmlHistoryGroup();
      recordHistory();
      updateProject(projectRef.current.id, (p) => mutate(p));
      markSaving();
    },
    [closeHtmlHistoryGroup, recordHistory, updateProject, markSaving]
  );

  const applySnapshot = React.useCallback(
    (snap: EditorSnapshot) => {
      setHtmlSelectionState(null);
      updateProject(projectRef.current.id, (p) => applyEditorSnapshot(p, snap));
      markSaving();
    },
    [updateProject, markSaving]
  );

  const undo = React.useCallback(() => {
    closeHtmlHistoryGroup();
    setHtmlSelectionState(null);
    setPast((p) => {
      if (p.length === 0) return p;
      const prev = p[p.length - 1];
      setFuture((f) => [createEditorSnapshot(projectRef.current), ...f]);
      applySnapshot(prev);
      return p.slice(0, -1);
    });
  }, [applySnapshot, closeHtmlHistoryGroup]);

  const redo = React.useCallback(() => {
    closeHtmlHistoryGroup();
    setHtmlSelectionState(null);
    setFuture((f) => {
      if (f.length === 0) return f;
      const nxt = f[0];
      setPast((p) => [...p, createEditorSnapshot(projectRef.current)]);
      applySnapshot(nxt);
      return f.slice(1);
    });
  }, [applySnapshot, closeHtmlHistoryGroup]);

  const setSelection = React.useCallback((t: EditTarget | null) => {
    setSelectionState(t);
    if (t) setRightTab("content");
  }, []);

  const setHtmlSelection = React.useCallback((next: HtmlElementSelection | null) => {
    setHtmlSelectionState(next);
    if (next) setRightTab("edit");
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

  const setActiveHtmlPage = React.useCallback(
    (id: string) => {
      closeHtmlHistoryGroup();
      updateProject(projectRef.current.id, (p) => {
        if (p.activeHtmlPageId === id || !p.htmlPages?.some((page) => page.id === id)) return p;
        return { ...p, activeHtmlPageId: id };
      });
      setSelectionState(null);
      setHtmlSelectionState(null);
      markSaving();
    },
    [closeHtmlHistoryGroup, markSaving, updateProject]
  );

  const updateHtmlPage = React.useCallback(
    (id: string, html: string) => {
      beginHtmlHistoryGroup(id);
      setHtmlSelectionState(null);
      updateProject(projectRef.current.id, (p) => replaceHtmlPageSource(p, id, html));
      markSaving();
    },
    [beginHtmlHistoryGroup, markSaving, updateProject]
  );

  const updateHtmlElement = React.useCallback(
    (target: HtmlElementSelection, patch: HtmlElementPatch) => {
      beginHtmlHistoryGroup(target.pageId);
      updateProject(projectRef.current.id, (p) => {
        const page = p.htmlPages?.find((item) => item.id === target.pageId);
        if (!page) return p;
        const html = editHtmlElement(page.html, target.path, target.tagName, patch);
        return html === page.html ? p : replaceHtmlPageSource(p, target.pageId, html);
      });
      setHtmlSelectionState((current) =>
        current && current.pageId === target.pageId && current.path.join(".") === target.path.join(".")
          ? {
              ...current,
              ...patch,
              styles: patch.styles ? { ...current.styles, ...patch.styles } : current.styles,
            }
          : current
      );
      markSaving();
    },
    [beginHtmlHistoryGroup, markSaving, updateProject]
  );

  // ---- assets ----
  const addAssets = React.useCallback(
    (urls: string[], category: AssetCategory, storageRefs?: string[]) =>
      commit((p) => ({
        ...p,
        assets: [
          ...urls.map((url, i) => ({
            id: uid("as"),
            name: `upload-${p.assets.length + i + 1}.jpg`,
            url,
            storageRef: storageRefs?.[i],
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
    (label: string) => {
      closeHtmlHistoryGroup();
      updateProject(projectRef.current.id, (p) =>
        addProjectVersion(p, {
          id: uid("ver"),
          label,
          createdAt: new Date().toISOString(),
        })
      );
      markSaving();
    },
    [closeHtmlHistoryGroup, markSaving, updateProject]
  );

  const restoreVersion = React.useCallback(
    (id: string) =>
      commit((p) => restoreProjectVersion(p, id)),
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
        content: "maro është tu e ndreq...",
        status: "thinking",
        createdAt: new Date().toISOString(),
      };
      updateProject(projectRef.current.id, (p) => ({
        ...p,
        conversation: { ...p.conversation, messages: [...p.conversation.messages, userMsg, thinking] },
      }));
      setSending(true);

      const apply = (result: AiEditResult) => {
        closeHtmlHistoryGroup();
        recordHistory();
        updateProject(projectRef.current.id, (p) => {
          const mutated = result.mutate(p);
          const versioned = addProjectVersion(mutated, {
            id: uid("ver"),
            label: result.versionLabel,
            createdAt: new Date().toISOString(),
          });
          return {
            ...versioned,
            conversation: {
              ...versioned.conversation,
              messages: versioned.conversation.messages.map((m) =>
                m.id === thinkingId ? { ...m, content: result.response, status: "done" } : m
              ),
            },
            credits: [
              ...versioned.credits,
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

      // HTML mode: edit Claude's full document directly. No local fallback
      // (there is no offline interpreter for raw HTML).
      if (projectRef.current.renderMode === "html") {
        requestHtmlEdit(prompt, projectRef.current)
          .then((r) => {
            closeHtmlHistoryGroup();
            recordHistory();
            setHtmlSelectionState(null);
            updateProject(projectRef.current.id, (p) => {
              const mutated = {
                ...p,
                htmlPages: (p.htmlPages ?? []).map((hp) =>
                  hp.id === r.pageId ? { ...hp, html: r.html } : hp
                ),
              };
              const versioned = addProjectVersion(mutated, {
                id: uid("ver"),
                label: r.versionLabel,
                createdAt: new Date().toISOString(),
              });
              return {
                ...versioned,
                conversation: {
                  ...versioned.conversation,
                  messages: versioned.conversation.messages.map((m) =>
                    m.id === thinkingId ? { ...m, content: r.reply, status: "done" } : m
                  ),
                },
                credits: [
                  ...versioned.credits,
                  {
                    id: uid("ct"),
                    label: r.versionLabel,
                    amount: -r.cost,
                    reason: "ai-edit",
                    createdAt: new Date().toISOString(),
                  },
                ],
              };
            });
            spendCredits(r.cost);
            markSaving();
            setSending(false);
          })
          .catch((err) => {
            if (err instanceof InsufficientCreditsError) {
              showError(
                `Nuk ke kredite të mjaftueshme për këtë ndryshim (nevojiten ${err.needed}). Shto kredite për të vazhduar.`
              );
              return;
            }
            showError(htmlEditErrorMessage(err));
          });
        return;
      }

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
    [sending, updateProject, spendCredits, markSaving, closeHtmlHistoryGroup, recordHistory]
  );

  const value: EditorContextValue = {
    project,
    device,
    setDevice,
    rightTab,
    setRightTab,
    selection,
    setSelection,
    htmlSelection,
    setHtmlSelection,
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
    setActiveHtmlPage,
    updateHtmlPage,
    updateHtmlElement,
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
