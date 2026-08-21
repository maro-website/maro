import { describe, expect, it } from "vitest";
import type { Project } from "@/lib/types";
import {
  applyEditorSnapshot,
  createEditorSnapshot,
  replaceHtmlPageSource,
} from "@/lib/editor/projectEditing";
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
});
