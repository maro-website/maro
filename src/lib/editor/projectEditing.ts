import type { Asset, HtmlPage, Project, Theme, WebsitePage } from "@/lib/types";

export interface EditorSnapshot {
  theme: Theme;
  pages: WebsitePage[];
  assets: Asset[];
  activePageId: string;
  htmlPages?: HtmlPage[];
  activeHtmlPageId?: string;
}

export function createEditorSnapshot(project: Project): EditorSnapshot {
  return {
    theme: structuredClone(project.theme),
    pages: structuredClone(project.pages),
    assets: structuredClone(project.assets),
    activePageId: project.activePageId,
    htmlPages: project.htmlPages ? structuredClone(project.htmlPages) : undefined,
    activeHtmlPageId: project.activeHtmlPageId,
  };
}

export function applyEditorSnapshot(project: Project, snapshot: EditorSnapshot): Project {
  return {
    ...project,
    theme: structuredClone(snapshot.theme),
    pages: structuredClone(snapshot.pages),
    assets: structuredClone(snapshot.assets),
    activePageId: snapshot.activePageId,
    htmlPages: snapshot.htmlPages ? structuredClone(snapshot.htmlPages) : undefined,
    activeHtmlPageId: snapshot.activeHtmlPageId,
  };
}

export function replaceHtmlPageSource(project: Project, pageId: string, html: string): Project {
  return {
    ...project,
    htmlPages: (project.htmlPages ?? []).map((page) =>
      page.id === pageId ? { ...page, html } : page
    ),
  };
}
