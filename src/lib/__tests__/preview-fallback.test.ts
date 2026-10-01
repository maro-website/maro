import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PreviewFallback, previewSource } from "@/components/app/PreviewFallback";
import { StableImage } from "@/components/app/StableImage";

describe("contextual media previews", () => {
  it("treats absent and historical decorative URLs as empty without fetching them", () => {
    for (const src of [null, undefined, "", "  ", "/images/hub/marketing-stack.png", "https://maro.al/images/hub/marketing-stack.png?v=1"]) {
      expect(previewSource(src)).toBeUndefined();
      const html = renderToStaticMarkup(React.createElement(StableImage, { src, alt: "", module: "logo" }));
      expect(html).toContain('data-preview-state="empty"');
      expect(html).not.toContain("<img");
    }
  });

  it("preserves real URLs, including signatures, data URLs, and blob previews", () => {
    for (const src of ["https://cdn.test/image.png?token=a%2Fb", "/uploads/real.png", "blob:https://maro.al/123", "data:image/png;base64,abc", "/uploads/marketing-stack.png"]) {
      expect(previewSource(src)).toBe(src);
    }
  });

  it("renders only a skeleton during loading, with inherited geometry and no icon or text", () => {
    const html = renderToStaticMarkup(React.createElement(PreviewFallback, { state: "loading", className: "aspect-video rounded-2xl" }));
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("aspect-video rounded-2xl");
    expect(html).not.toMatch(/<svg|<img|gradient/);
    expect(html).toMatch(/><\/span>$/);
  });

  it.each([
    ["imazh", "lucide-image"], ["logo", "lucide-shapes"], ["web", "lucide-panels-top-left"], ["project", "lucide-file"],
  ])("uses a small contextual icon for %s", (module, icon) => {
    const html = renderToStaticMarkup(React.createElement(PreviewFallback, { module }));
    expect(html).toContain(icon);
    expect(html).toContain('width="22"');
    expect(html).toContain("opacity-40");
    expect(html).not.toMatch(/<img|gradient/);
  });

  it("distinguishes unavailable previews from empty ones", () => {
    const html = renderToStaticMarkup(React.createElement(PreviewFallback, { state: "error", module: "logo" }));
    expect(html).toContain("lucide-image-off");
    expect(html).toContain('data-preview-state="error"');
    expect(html).toContain("Preview nuk është i disponueshëm");
    expect(html).not.toContain("<img");
  });
});
