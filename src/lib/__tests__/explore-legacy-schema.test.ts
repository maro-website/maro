import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Explore legacy schema compatibility", () => {
  it("keeps feed queries free of the unsupported author_avatar column", () => {
    const route = readFileSync("src/app/api/explore/route.ts", "utf8");
    const fullSelect = route.match(/const SELECT_FULL =\s*\n\s*"([^"]+)";/)?.[1];
    const legacySelect = route.match(/const SELECT_LEGACY =\s*\n\s*"([^"]+)";/)?.[1];

    expect(fullSelect).toBeTruthy();
    expect(fullSelect).not.toContain("author_avatar");
    expect(legacySelect).toBeTruthy();
    expect(legacySelect).not.toContain("author_avatar");
    expect(route.match(/\.select\(SELECT_LEGACY\)/g)).toHaveLength(2);
  });
});
