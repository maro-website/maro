import { describe, expect, it } from "vitest";
import type { Project } from "@/lib/types";
import {
  addProjectVersion,
  applyEditorSnapshot,
  createEditorSnapshot,
  MAX_PROJECT_VERSIONS,
  replaceHtmlPageSource,
  restoreProjectVersion,
} from "@/lib/editor/projectEditing";
import { isHtmlEditorBridgeMessage } from "@/lib/editor/htmlVisualEditing";
import { makeProject } from "@/lib/mock/demo";

function htmlProject(): Project {
  const project = makeProject({
    name: "Maro Test",
    businessName: "Maro Test",
    goal: "Test HTML editing",
    category: "generic",
    style: "minimal",
    language: "sq",
  });
  return {
    ...project,
    renderMode: "html",
    htmlPages: [
      { id: "home", name: "Home", slug: "", html: "<h1>Home</h1>" },
      { id: "about", name: "About", slug: "about", html: "<h1>About</h1>" },
    ],
    activeHtmlPageId: "home",
  };
}

describe("maroWeb HTML editor recovery", () => {
  it("updates only the requested HTML page", () => {
    const project = htmlProject();
    const updated = replaceHtmlPageSource(project, "about", "<h1>Changed</h1>");

    expect(updated.htmlPages?.find((page) => page.id === "home")?.html).toBe("<h1>Home</h1>");
    expect(updated.htmlPages?.find((page) => page.id === "about")?.html).toBe("<h1>Changed</h1>");
  });

  it("restores HTML pages and active HTML page from an editor snapshot", () => {
    const project = htmlProject();
    const snapshot = createEditorSnapshot(project);
    const changed = {
      ...replaceHtmlPageSource(project, "home", "<h1>Broken</h1>"),
      activeHtmlPageId: "about",
    };
    const restored = applyEditorSnapshot(changed, snapshot);

    expect(restored.htmlPages).toEqual(project.htmlPages);
    expect(restored.activeHtmlPageId).toBe("home");
  });

  it("keeps snapshots isolated from later project mutations", () => {
    const project = htmlProject();
    const snapshot = createEditorSnapshot(project);
    project.htmlPages![0].html = "<h1>Mutated</h1>";

    expect(snapshot.htmlPages?.[0].html).toBe("<h1>Home</h1>");
  });

  it("keeps only the ten latest HTML-aware versions", () => {
    let project = htmlProject();
    for (let index = 0; index < 12; index += 1) {
      project = addProjectVersion(project, {
        id: `version-${index}`,
        label: `Version ${index}`,
        createdAt: new Date(2026, 0, index + 1).toISOString(),
      });
    }

    expect(project.versions).toHaveLength(MAX_PROJECT_VERSIONS);
    expect(project.versions[0].id).toBe("version-2");
    expect(project.versions.at(-1)?.snapshot.htmlPages).toEqual(project.htmlPages);
  });

  it("restores an HTML checkpoint including its active page", () => {
    const checkpointed = addProjectVersion(htmlProject(), {
      id: "checkpoint",
      label: "Checkpoint",
      createdAt: new Date().toISOString(),
    });
    const changed = {
      ...replaceHtmlPageSource(checkpointed, "home", "<h1>Changed</h1>"),
      activeHtmlPageId: "about",
    };

    const restored = restoreProjectVersion(changed, "checkpoint");
    expect(restored.htmlPages?.[0].html).toBe("<h1>Home</h1>");
    expect(restored.activeHtmlPageId).toBe("home");
  });

  it("accepts only strictly scoped iframe selection messages", () => {
    const message = {
      source: "maro-preview-editor",
      channel: "editor-1",
      type: "select",
      selection: {
        path: [1, 0],
        tagName: "h1",
        kind: "text",
        text: "Hello",
      },
    };

    expect(isHtmlEditorBridgeMessage(message, "editor-1")).toBe(true);
    expect(isHtmlEditorBridgeMessage(message, "another-editor")).toBe(false);
    expect(
      isHtmlEditorBridgeMessage(
        { ...message, selection: { ...message.selection, path: [-1] } },
        "editor-1"
      )
    ).toBe(false);
  });
});
