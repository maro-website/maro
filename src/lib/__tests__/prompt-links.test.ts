import { describe, expect, it } from "vitest";
import { promptLinks } from "@/lib/prompt/links";

describe("prompt link previews", () => {
  it("keeps separate unique links and derives the favicon without the private query", () => {
    const links = promptLinks("See https://maro.al/path?token=private and www.nice.al. Again https://maro.al/path?token=private");
    expect(links).toEqual([
      { href: "https://maro.al/path?token=private", label: "maro.al/path", favicon: "https://maro.al/favicon.ico" },
      { href: "https://www.nice.al/", label: "www.nice.al", favicon: "https://www.nice.al/favicon.ico" },
    ]);
  });
  it("trims sentence punctuation while preserving balanced URL parentheses", () => {
    expect(promptLinks("(https://example.com/page). https://example.com/wiki/A_(B)").map(link => link.href))
      .toEqual(["https://example.com/page", "https://example.com/wiki/A_(B)"]);
  });
  it("does not render unsafe schemes, credentials, or incomplete links", () => {
    expect(promptLinks("javascript:alert(1) data:text/html,test https://name:secret@example.com https:// www.")).toEqual([]);
  });
});
