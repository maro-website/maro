import { describe, expect, it } from "vitest";
import type { ImageCreation } from "@/lib/types";
import { resumableCreations, resumeHref } from "./data";

const creation = (id: string, day: number, patch: Partial<ImageCreation> = {}): ImageCreation => ({
  id, toolId: "reklama", prompt: "An image", urls: [], workspaceId: "studio-a",
  createdAt: `2026-09-${String(day).padStart(2, "0")}T10:00:00Z`, ...patch,
});

describe("Hub continuation data boundaries", () => {
  it("hides the previous workspace while the new scope is loading", () => {
    expect(resumableCreations([creation("a", 1)], "studio-a", "studio-b")).toEqual([]);
    expect(resumableCreations([creation("a", 1)], null, null)).toEqual([]);
  });
  it("excludes other workspaces, unsupported logo reopening, and invalid dates", () => {
    const input = [creation("good", 1), creation("other", 2, { workspaceId: "studio-b" }), creation("logo", 3, { toolId: "logo" }), creation("bad-date", 4, { createdAt: "invalid" })];
    expect(resumableCreations(input, "studio-a", "studio-a").map((c) => c.id)).toEqual(["good"]);
  });
  it("keeps only three most recent results without changing the store's order", () => {
    const input = [creation("one", 1), creation("four", 4), creation("two", 2), creation("three", 3)];
    expect(resumableCreations(input, "studio-a", "studio-a").map((c) => c.id)).toEqual(["four", "three", "two"]);
    expect(input[0].id).toBe("one");
  });
  it("supports real device-local history and encodes the reopen identifier", () => {
    expect(resumableCreations([creation("local", 1, { workspaceId: undefined })], "local", null)).toHaveLength(1);
    expect(resumeHref("id&other=value")).toBe("/imazh?open=id%26other%3Dvalue");
  });
});
