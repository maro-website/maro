import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { adaptRecraftImagePrompt, type RecraftPromptPart } from "@/lib/ai/recraftPrompt";
import { buildCanonicalImagePrompt } from "@/lib/generation/v1ImagePrompt";
import { parseV1ImageRequest, resolveV1ImageRequest } from "@/lib/generation/v1ImageRequest";
import { modelRow, imazhRequest } from "./helpers/v1ImageFixtures";

const sources = vi.hoisted(() => ({ system: "PLATFORM INSTRUCTIONS. ".repeat(500), preset: "BOTANICAL BAG. ".repeat(950) }));
vi.mock("@/lib/ai/recraftPromptVariants", async () => {
  const { createHash } = await import("node:crypto");
  const hash = (text: string) => createHash("sha256").update(text).digest("hex");
  return { RECRAFT_LOCAL_PROMPT_VARIANTS: {
    [hash(sources.system)]: { version: "system/1", text: "COMPACT PLATFORM" },
    [hash(sources.preset)]: { version: "preset/1", text: "COMPACT BOTANICAL BAG" },
  } };
});
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const parts = (): RecraftPromptPart[] => [
  { kind: "system", text: sources.system }, { kind: "preset", text: sources.preset },
  { kind: "context", text: 'EXACT USER TEXT "WELCOME 123"' }, { kind: "context", text: "FULL PRIVATE BRAIN" },
];
beforeEach(() => vi.clearAllMocks());

describe("free local Recraft compatibility compilation", () => {
  it("uses only reviewed exact source versions, preserves user/Brain and makes zero network calls", () => {
    const network = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network forbidden"));
    try {
      const result = adaptRecraftImagePrompt("recraftv4_1_flash", parts());
      expect(result.prompt).toContain("COMPACT PLATFORM"); expect(result.prompt).toContain("COMPACT BOTANICAL BAG");
      expect(result.prompt).toContain('EXACT USER TEXT "WELCOME 123"'); expect(result.prompt).toContain("FULL PRIVATE BRAIN");
      expect(result.prompt).toContain("LOWER PRIORITY"); expect(result.prompt).toContain("follow the user and tool choices");
      expect(result.adaptation?.variants.map(v => v.sourceHash)).toEqual([hash(sources.system), hash(sources.preset)]);
      expect(network).not.toHaveBeenCalled();
      expect(adaptRecraftImagePrompt("recraftv4_1_flash", parts())).toEqual(result);
    } finally { network.mockRestore(); }
  });
  it("never applies platform variants to user/Brain/context, including exact matching text", () => {
    expect(() => adaptRecraftImagePrompt("recraftv4_1_flash", [{ kind: "context", text: sources.system }])).toThrow("recraft_prompt_too_long");
  });
  it("invalidates variants when Engine or preset content changes", () => {
    expect(adaptRecraftImagePrompt("recraftv4_1_flash", [{ kind: "system", text: sources.system }]).prompt).toBe("COMPACT PLATFORM");
    for (const kind of ["system", "preset"] as const) {
      expect(() => adaptRecraftImagePrompt("recraftv4_1_flash", [{ kind, text: sources[kind] + " New authoritative direction." }])).toThrow("recraft_prompt_too_long");
    }
  });
  it.each(["gpt-image-2.5-flare", "gpt-image-2.5-sunburst"])("keeps the entire original prompt for %s", (model) => {
    const result = adaptRecraftImagePrompt(model, parts());
    expect(result.prompt).toContain(sources.system.trim()); expect(result.prompt).toContain(sources.preset.trim());
    expect(result.adaptation).toBeUndefined();
  });
  it.each(["recraftv4_1_flash", "recraftv3"])("validates the final exact budget for %s without truncating or dropping context", (model) => {
    const limit = model === "recraftv3" ? 1000 : 10000;
    for (const length of [limit - 1, limit, limit + 1]) {
      const input: RecraftPromptPart[] = [{ kind: "context", text: "x".repeat(length) }];
      if (length > limit) expect(() => adaptRecraftImagePrompt(model, input)).toThrow("recraft_prompt_too_long");
      else expect(adaptRecraftImagePrompt(model, input).prompt).toHaveLength(length);
    }
    expect(() => adaptRecraftImagePrompt(model, [...parts(), { kind: "context", text: "USER CONTEXT ".repeat(1000) }])).toThrow("recraft_prompt_too_long");
  });
  it("anchors the exact adapted payload while retaining original source hashes, layers, mood, Brain and Engine price", async () => {
    const row = { ...modelRow(), model_id: "recraftv4_1_flash", provider: "recraft", is_default: false, metadata: { providerModelId: "recraftv4_1_flash", description: "Recraft" } };
    const { snapshot } = await resolveV1ImageRequest(parseV1ImageRequest({ ...imazhRequest, prompt: 'EXACT USER TEXT "WELCOME 123"', model: "recraftv4_1_flash", maroPrompt: { id: "preset" }, useWorkspaceBrand: true }), "owner", {
      authorizeRecraft: async () => {}, loadModels: async () => [modelRow(), row], resolveWorkspace: async () => "owned", resolveReference: vi.fn(), loadPreset: async () => ({ full_prompt: sources.preset, target_tool: "reklama" }),
    });
    const config = { system: { id: "system", tool_id: "maro_imazh", version_label: "v1", status: "live", content: sources.system }, layers: [{
      id: "layer", tool_id: "maro_imazh", layer_key: "v1.production.output.text", version_label: "v1", status: "live", enabled: true, priority: 1, instructions: "EXACT ENGINE OUTPUT RULE", conditions: [],
    }] };
    const mood = "EXACT MOOD DIRECTION";
    const result = buildCanonicalImagePrompt({ ...snapshot, moodId: "mood", moodContentHash: hash(mood) }, config, { presetPrompt: sources.preset, moodPrompt: mood, brainText: "FULL PRIVATE BRAIN", references: [] });
    for (const content of [snapshot.prompt, "FULL PRIVATE BRAIN", "EXACT ENGINE OUTPUT RULE", mood]) expect(result.prompt).toContain(content);
    expect(result.provenance.system.hash).toBe(hash(sources.system)); expect(result.provenance.preset?.hash).toBe(hash(sources.preset));
    expect(result.provenance.promptHash).toBe(hash(result.prompt)); expect(result.provenance.promptAdaptation?.variants).toHaveLength(2);
    expect(result.prompt.length).toBeLessThanOrEqual(10000); expect(snapshot.model.customerCredits).toBe(7);
  });
});
