import { describe, expect, it, vi } from "vitest";
import { resolveFortConfig, isFortModuleEnabled } from "@/lib/fort/config";
import { MARO_FORT_ENABLED, withoutParkedFort } from "@/lib/shadow/maroFort";
import { compileGenerationBrief } from "@/lib/engine/compiler";
import { legacyComposePrompt } from "@/lib/engine/legacyCompose";
import { IMAZH_PARITY_FIXTURES } from "@/lib/engine/imageParityFixtures";
import { buildTestContext, WEB_PARITY_FIXTURES } from "@/lib/engine";

describe("parked maroFort", () => {
  it("overrides enabled admin config for every supported module", () => {
    expect(MARO_FORT_ENABLED).toBe(false);
    expect(resolveFortConfig({ enabled: true }).enabled).toBe(false);
    for (const moduleId of ["imazh", "logo", "web"] as const) {
      expect(isFortModuleEnabled({ enabled: true }, moduleId)).toBe(false);
    }
  });

  it("strips stale Fort requests without changing Brain or saved values", () => {
    const input = { useBrain: true, workspaceId: "brand-workspace", fort: { enabled: true, values: { tone: "bold" } } };
    expect(withoutParkedFort(input)).toEqual({ ...input, fort: undefined });
    expect(input.fort.values.tone).toBe("bold");
  });

  for (const fixture of [...WEB_PARITY_FIXTURES, ...IMAZH_PARITY_FIXTURES].filter(f => f.engine.fort?.enabled)) {
    it(`ignores expert prompts and conflicts in ${fixture.id}`, () => {
      const ctx = buildTestContext(fixture.toolId);
      expect(compileGenerationBrief(fixture.engine, ctx)).toEqual(
        compileGenerationBrief({ ...fixture.engine, fort: undefined }, ctx),
      );
      expect(legacyComposePrompt(fixture.legacy)).toEqual(
        legacyComposePrompt({ ...fixture.legacy, fort: undefined }),
      );
    });
  }

  it("reports disabled public settings even without a database", async () => {
    vi.doMock("@/lib/supabase/server", () => ({ supabaseServerConfigured: () => false }));
    const { GET } = await import("@/app/api/settings/public/route");
    const response = await GET(new Request("http://localhost/api/settings/public"));
    expect((await response.json()).fort_config).toEqual({ enabled: false });
    vi.doUnmock("@/lib/supabase/server");
  });
});
