import type { Asset, HtmlPage, Project, Theme, Version, WebsitePage } from "@/lib/types";

export const MAX_PROJECT_VERSIONS = 10;

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

function versionSnapshot(project: Project): Version["snapshot"] {
  return {
    theme: structuredClone(project.theme),
    pages: structuredClone(project.pages),
    htmlPages: project.htmlPages ? structuredClone(project.htmlPages) : undefined,
    activeHtmlPageId: project.activeHtmlPageId,
  };
}

export function addProjectVersion(
  project: Project,
  input: { id: string; label: string; createdAt: string }
): Project {
  const version: Version = { ...input, snapshot: versionSnapshot(project) };
  return {
    ...project,
    versions: [...project.versions, version].slice(-MAX_PROJECT_VERSIONS),
  };
}

export function restoreProjectVersion(project: Project, versionId: string): Project {
  const version = project.versions.find((item) => item.id === versionId);
  if (!version) return project;

  const htmlPages = version.snapshot.htmlPages
    ? structuredClone(version.snapshot.htmlPages)
    : project.htmlPages;

  return {
    ...project,
    theme: structuredClone(version.snapshot.theme),
    pages: structuredClone(version.snapshot.pages),
    activePageId: version.snapshot.pages[0]?.id ?? project.activePageId,
    htmlPages,
    activeHtmlPageId:
      version.snapshot.activeHtmlPageId ?? htmlPages?.[0]?.id ?? project.activeHtmlPageId,
  };
}
