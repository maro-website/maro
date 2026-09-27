import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PRESET_TOOL_META,
  presetInitialPrompt,
  presetSelections,
  sanitizePresetConfig,
  wrapPresetRecommendation,
} from "@/lib/presets/model";

describe("maroPresets 2.0 model", () => {
  it("maps every first-class preset tool to its canonical product route", () => {
    expect(PRESET_TOOL_META.imazh).toMatchObject({ targetTool: "reklama", route: "/imazh" });
    expect(PRESET_TOOL_META.logo).toMatchObject({ targetTool: "logo", route: "/marologo" });
    expect(PRESET_TOOL_META.web).toMatchObject({ targetTool: "website", route: "/web" });
  });

  it("persists only stable Logo product concepts", () => {
    const config = sanitizePresetConfig("logo", {
      version: 99,
      logoType: "symbol_wordmark",
      conceptIntent: "meaning",
      visualStyle: "minimal_intelligent",
      presentationMode: "bento",
      traits: ["clear", "confident", "timeless", "discarded"],
      rawReactState: { modal: true },
    });
    expect(config).toEqual({
      version: 1,
      logoType: "symbol_wordmark",
      conceptIntent: "meaning",
      visualStyle: "minimal_intelligent",
      presentationMode: "bento",
      traits: ["clear", "confident", "timeless"],
    });
    expect(config).not.toHaveProperty("rawReactState");
  });

  it("turns Web config into editable starting state without generating", () => {
    const config = sanitizePresetConfig("web", {
      websiteType: "landing",
      siteStyle: "editorial minimal",
      layout: "conversion hierarchy",
      useCase: "restaurant launch",
    });
    expect(presetSelections("web", config)).toEqual({ type: "landing" });
    expect(presetInitialPrompt("web", config)).toContain("restaurant launch");
    expect(presetInitialPrompt("web", config)).toContain("editorial minimal");
  });

  it("labels hidden preset prompts as lower priority than explicit requests", () => {
    const wrapped = wrapPresetRecommendation("Dark minimal website");
    expect(wrapped).toContain("LOWER PRIORITY");
    expect(wrapped).toContain("explicit user brief");
  });
});

describe("maroPresets 2.0 migration", () => {
  const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/0044_maropresets_multi_tool.sql"), "utf8");

  it("evolves the canonical table and backfills existing Imazh-compatible records", () => {
    expect(sql).toContain("alter table public.maro_prompts");
    expect(sql).toContain("else 'imazh'");
    expect(sql).toContain("config jsonb");
    expect(sql).toContain("maro_prompts_browse_idx");
    expect(sql).not.toMatch(/drop table\s+public\.maro_prompts/i);
  });

  it("keeps only two clearly temporary proof records", () => {
    expect(sql.match(/TEMP-(?:LOGO|WEB)-/g)).toHaveLength(2);
    expect(sql).toContain("[TEMP] Minimal Identity");
    expect(sql).toContain("[TEMP] Editorial Landing");
  });
});

describe("maroPresets browse architecture", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/prompts/page.tsx"), "utf8");
  const cards = readFileSync(resolve(process.cwd(), "src/components/presets/PresetCard.tsx"), "utf8");
  const browseApi = readFileSync(resolve(process.cwd(), "src/app/api/prompts/route.ts"), "utf8");
  const detailApi = readFileSync(resolve(process.cwd(), "src/app/api/prompts/[id]/route.ts"), "utf8");

  it("keeps tool selection and scoped search in shareable URL state", () => {
    expect(page).toContain('params.set("tool", next)');
    expect(page).toContain('params.set("q", query.trim())');
    expect(page).toContain('router.push(`${pathname}?${params.toString()}`');
  });

  it("uses tool-specific card ratios with Web fixed at 16:9", () => {
    expect(cards).toContain('web: "aspect-video"');
    expect(cards).toContain('logo: "aspect-square"');
    expect(cards).toContain('imazh: "aspect-[4/5]"');
  });

  it("keeps browse payloads light and fetches config only from detail", () => {
    const browseFields = browseApi.match(/const BROWSE_FIELDS = "([^"]+)"/)?.[1] ?? "";
    expect(browseFields).not.toContain("full_prompt");
    expect(browseFields).not.toContain("config");
    expect(detailApi).toContain("config\")");
    expect(detailApi).not.toContain("full_prompt");
  });
});
