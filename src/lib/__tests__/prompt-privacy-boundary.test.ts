import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("compiled Maro prompt privacy boundary", () => {
  it("moves existing compiled prompts to a service-role-only table", () => {
    const migration = source("supabase/migrations/0045_generation_prompt_privacy.sql");

    expect(migration).toContain("generation_internal_prompts");
    expect(migration).toContain("revoke all on table public.generation_internal_prompts from anon, authenticated");
    expect(migration).toContain("grant select, insert, update, delete on table public.generation_internal_prompts to service_role");
    expect(migration).toMatch(/update public\.generations\s+set final_prompt = null/i);
  });

  it("persists only the original prompt on the user-readable generation row", () => {
    const server = source("src/lib/supabase/server.ts");

    expect(server).toContain("const { final_prompt, ...publicEntry } = entry");
    expect(server).toContain(".insert({ ...publicEntry, final_prompt: null, workspace_id })");
    expect(server).toContain('.from("generation_internal_prompts")');
  });

  it("does not expose provider or compiler detail in image result events", () => {
    const service = source("src/lib/maro-imazh/applicationService.ts");

    expect(service).not.toMatch(/send\(\{[\s\S]{0,180}\bdetail:/);
    expect(source("src/app/api/creations/route.ts")).not.toContain("final_prompt");
  });
});
