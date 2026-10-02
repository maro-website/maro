import { describe, expect, it, vi } from "vitest";
import { parseV1ImageRequest, resolveV1ImageRequest, type V1ImageRequestDependencies } from "@/lib/generation/v1ImageRequest";
import { publicV1ImageModel, readV1ImageModelConfiguration, resolveV1ImageModel } from "@/lib/engine/v1ImageModels";
import { logoRequest, imazhRequest, modelRow } from "./helpers/v1ImageFixtures";

function dependencies(module = "maro_imazh"): V1ImageRequestDependencies {
  return {
    loadModels: vi.fn(async () => [modelRow("flare", module), ...(module === "maro_imazh" ? [modelRow("sunburst")] : [])]),
    resolveWorkspace: vi.fn(async () => "workspace-owned"),
    resolveReference: vi.fn(async () => ({ dataUrl: "data:image/png;base64,TEST", mime: "image/png", digest: "digest", normalized: false })),
    loadPreset: vi.fn(async () => ({ full_prompt: "PRIVATE TEMPLATE", target_tool: module === "maro_logo" ? "logo" : "reklama" })),
  };
}

describe("V1 pure input boundary", () => {
  it("accepts ten distinct private attachments and rejects eleven", () => {
    const attachments = Array.from({ length: 10 }, (_, index) => `storage:generations/user/project-assets/${index}.png`);
    expect(parseV1ImageRequest({ ...imazhRequest, attachments }).referenceIds).toEqual(attachments);
    expect(() => parseV1ImageRequest({ ...imazhRequest, attachments: [...attachments, "storage:generations/user/eleven.png"] })).toThrow("invalid_image_reference");
  });
  it.each([3999, 4000, 4001, 8000, 32000, 64000])("accepts a %i character Imazh input without truncation", (length) => {
    const prompt = "a".repeat(length);
    expect(parseV1ImageRequest({ ...imazhRequest, prompt }).prompt).toBe(prompt);
  });
  it.each([null, undefined, {}, [], 7, true])("rejects non-string prompt %j", (prompt) => {
    expect(() => parseV1ImageRequest({ ...imazhRequest, prompt })).toThrowError(expect.objectContaining({ code: "invalid_string", field: "prompt" }));
  });
  it("reports the transport ceiling separately from the compiled limit", () => {
    expect(() => parseV1ImageRequest({ ...imazhRequest, prompt: "a".repeat(64001) })).toThrowError(expect.objectContaining({
      code: "prompt_too_long", field: "prompt", metadata: { userPromptLength: 64001, maxUserPromptLength: 64000 },
    }));
  });
  it.each([undefined, "flare", "sunburst"])("Imazh accepts %s and defaults only omission", (model) => {
    const parsed = parseV1ImageRequest({ ...imazhRequest, model });
    expect(parsed).toMatchObject({ module: "maro_imazh", logicalModel: model, imageCount: 1, quality: "high", size: "1024x1536", useBrain: false });
    expect(parsed.selections).toMatchObject({ ...(model ? { model } : {}), format: "ig-post", text: "off", font: "modern", speed: "normal" });
  });
  it.each(["maroImazh", "imazh", "image", "maro_imazh", "reklama"])("normalizes alias %s", (toolId) => {
    expect(parseV1ImageRequest({ ...imazhRequest, toolId }).module).toBe("maro_imazh");
  });
  it.each(["gpt-image-2", "unknown", "", null, 0, {}, []])("rejects explicit model %j", (model) => {
    expect(() => parseV1ImageRequest({ ...imazhRequest, model })).toThrow("unknown_model");
  });
  it.each([
    { selections: { format: "free" } }, { selections: { speed: "free" } }, { selections: { text: "maybe" } },
    { selections: { font: "made-up" } }, { selections: { price: "0" } }, { cost: 0 }, { credits: 0 },
    { selections: null }, { selections: [] }, { quality: "low" }, { quality: null },
    { n: 0 }, { n: 4 }, { n: "1" }, { n: -1 }, { size: "auto" }, { size: "1024x1024" },
    { useWorkspaceBrand: "true" }, { maroPrompt: {} }, { maroPrompt: { id: "preset", prompt: "override" } },
    { workspaceId: "" }, { workspaceId: null }, { prompt: 42 }, { attachments: ["data:image/png;base64,x"] },
    { attachments: ["https://example.org/x.png"] }, { attachments: ["storage:generations/a", "storage:generations/a"] },
    { attachments: ["a", "b", "c", "d"] }, { model: "flare", selections: { model: "sunburst" } },
  ])("rejects manipulated input %j", (change) => {
    expect(() => parseV1ImageRequest({ ...imazhRequest, ...change })).toThrow();
  });
  it.each([["ig-post", "1024x1536"], ["ig-story", "1024x1536"], ["fb-post", "1024x1024"], ["yt-thumb", "1536x1024"]])("retains format %s", (format, size) => {
    expect(parseV1ImageRequest({ ...imazhRequest, selections: { format }, size }).size).toBe(size);
  });
  it("accepts the actual Wizard payload and forcibly disables Brain", () => {
    const request = logoRequest();
    const parsed = parseV1ImageRequest({ ...request, useWorkspaceBrand: true });
    expect(parsed).toMatchObject({ module: "maro_logo", logicalModel: "flare", useBrain: false, size: "1024x1024", selections: { type: "both", present: "bento" } });
    expect(parsed.logoWizard).toEqual(request.logoWizard);
    expect(parseV1ImageRequest({ ...request, selections: undefined }).logicalModel).toBe("flare");
  });
  it.each(["sunburst", "unknown", "gpt-image-2", null])("Logo rejects %s", (model) => {
    expect(() => parseV1ImageRequest({ ...logoRequest(), selections: { model } })).toThrow();
  });
  it.each([
    { logoWizard: undefined }, { logoWizard: {} }, { logoWizard: { ...logoRequest().logoWizard, direction: null } },
    { logoWizard: { ...logoRequest().logoWizard, provider: "other" } },
    { logoWizard: { ...logoRequest().logoWizard, logo: { type: "arbitrary" } } },
    { logoWizard: { ...logoRequest().logoWizard, look: { colors: { mode: "custom", values: ["red"] } } } },
    { selections: { present: "mockup" } }, { selections: { speed: "fast" } },
  ])("Logo rejects invalid Wizard structure/options %j", (change) => {
    expect(() => parseV1ImageRequest({ ...logoRequest(), ...change })).toThrow();
  });
});

describe("authoritative model configuration", () => {
  it.each([0, -1, 1.5, NaN, Infinity, undefined, null, "7"])("fails closed for price %j", (price) => {
    const row = modelRow();
    expect(() => resolveV1ImageModel([{ ...row, cost_metadata: { ...row.cost_metadata, customerCredits: price } }], "maro_imazh", "flare")).toThrow("invalid_model_price");
  });
  it("requires a configured row and never substitutes another model", () => {
    expect(() => resolveV1ImageModel([], "maro_imazh", "flare")).toThrow("model_not_configured");
    expect(() => resolveV1ImageModel([modelRow()], "maro_imazh", "sunburst")).toThrow("model_not_configured");
    expect(() => resolveV1ImageModel([{ ...modelRow(), enabled: false, is_default: false }, { ...modelRow("sunburst"), is_default: true }], "maro_imazh", "flare")).toThrow("model_disabled");
  });
  it.each([
    { metadata: null }, { cost_metadata: null }, { is_default: "false" }, { provider: "other" },
    { metadata: { providerModelId: "gpt-image-2", description: "legacy" } },
  ])("rejects conflicting configuration %j with 503", (change) => {
    try { readV1ImageModelConfiguration({ ...modelRow(), ...change }, "maro_imazh"); expect.fail("accepted"); }
    catch (error) { expect(error).toMatchObject({ status: 503 }); }
  });
  it("allows independent prices without assuming a Sunburst premium, and projects only safe fields", () => {
    const flare = readV1ImageModelConfiguration(modelRow("flare", "maro_imazh", 9), "maro_imazh");
    const sunburst = readV1ImageModelConfiguration(modelRow("sunburst", "maro_imazh", 4), "maro_imazh");
    expect(sunburst.customerCredits).toBeLessThan(flare.customerCredits);
    expect(Object.keys(publicV1ImageModel(flare)).sort()).toEqual(["key", "label", "descriptor", "customerCredits", "enabled", "isDefault", "order"].sort());
    expect(JSON.stringify(publicV1ImageModel(flare))).not.toMatch(/gpt-image|private|fingerprint|provider/);
    expect(flare.fingerprint).not.toBe(readV1ImageModelConfiguration(modelRow("flare", "maro_imazh", 10), "maro_imazh").fingerprint);
  });
});

describe("trusted snapshot resolution", () => {
  it("freezes a private generation snapshot, reads model configuration once, and keeps bytes/templates outside metadata", async () => {
    const deps = dependencies();
    const input = parseV1ImageRequest({ ...imazhRequest, model: "sunburst", maroPrompt: { id: "published" }, attachments: ["storage:generations/refs/user/a.png"], useWorkspaceBrand: true });
    const result = await resolveV1ImageRequest(input, "user", deps);
    input.selections.format = "tampered";
    expect(result.snapshot).toMatchObject({ contractVersion: "v1-image-request/1", modulePolicy: "maro-v1", useBrain: true, model: { logicalModel: "sunburst", providerModelId: "gpt-image-2.5-sunburst", customerCredits: 7 }, references: [{ digest: "digest" }] });
    expect(result.snapshot.selections.format).toBe("ig-post");
    expect(Object.isFrozen(result.snapshot.model)).toBe(true);
    expect(Object.isFrozen(result.snapshot.selections)).toBe(true);
    expect(deps.loadModels).toHaveBeenCalledTimes(1);
    expect(deps.resolveReference).toHaveBeenCalledWith("storage:generations/refs/user/a.png", "user");
    expect(deps.loadPreset).toHaveBeenCalledWith("published", "reklama");
    expect(JSON.stringify(result.snapshot)).not.toMatch(/PRIVATE TEMPLATE|data:image/);
    expect(result.presetPrompt).toBe("PRIVATE TEMPLATE");
  });
  it.each([null, { full_prompt: "", target_tool: "reklama" }, { full_prompt: "Other module", target_tool: "logo" }])("rejects missing/unpublished/empty/incompatible preset %j", async (preset) => {
    const deps = dependencies();
    vi.mocked(deps.loadPreset).mockResolvedValue(preset);
    await expect(resolveV1ImageRequest(parseV1ImageRequest({ ...imazhRequest, maroPrompt: { id: "bad" } }), "user", deps)).rejects.toThrow("invalid_preset");
  });
  it("requires an owned workspace for Brain but never enables it for Logo", async () => {
    const deps = dependencies();
    vi.mocked(deps.resolveWorkspace).mockResolvedValue(null);
    await expect(resolveV1ImageRequest(parseV1ImageRequest({ ...imazhRequest, useWorkspaceBrand: true }), "user", deps)).rejects.toThrow("workspace_required");
    const logoDeps = dependencies("maro_logo");
    vi.mocked(logoDeps.resolveWorkspace).mockResolvedValue(null);
    expect((await resolveV1ImageRequest(parseV1ImageRequest({ ...logoRequest(), useWorkspaceBrand: true }), "user", logoDeps)).snapshot.useBrain).toBe(false);
  });
  it("preserves reference ownership rejection", async () => {
    const deps = dependencies();
    vi.mocked(deps.resolveReference).mockRejectedValue(new Error("forbidden_reference"));
    await expect(resolveV1ImageRequest(parseV1ImageRequest({ ...imazhRequest, attachments: ["storage:generations/refs/other/a.png"] }), "user", deps)).rejects.toMatchObject({ code: "forbidden_reference", status: 403 });
  });
});
