import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("active workspace server boundary", () => {
  it("validates the persisted active workspace against the authenticated owner", () => {
    const server = fs.readFileSync(
      path.join(process.cwd(), "src/lib/supabase/server.ts"),
      "utf8"
    );
    const start = server.indexOf("export async function getActiveWorkspaceId");
    const end = server.indexOf("export async function resolveWorkspaceId", start);
    const resolver = server.slice(start, end);

    expect(resolver).toContain('.from("profiles")');
    expect(resolver).toContain('.from("workspaces")');
    expect(resolver).toContain('.eq("owner_id", userId)');
    expect(resolver).toContain('.update({ active_workspace_id: fallbackId })');
  });
});
