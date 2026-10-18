import { afterEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { RECRAFT_MODELS, canUseRecraft } from "@/lib/ai/recraftModels";
import { generateRecraftImage, planRecraftImage } from "@/lib/ai/recraft";
import { readV1ImageModelConfiguration, publicV1ImageModel, resolveV1ImageModel } from "@/lib/engine/v1ImageModels";
import { parseV1ImageRequest, resolveV1ImageRequest } from "@/lib/generation/v1ImageRequest";
import { validateModelEdits } from "@/lib/admin/v1Configuration";
import { imazhRequest, modelRow } from "./helpers/v1ImageFixtures";

const auth = vi.hoisted(() => ({ email: "member@example.invalid" }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdmin: () => ({ auth: { admin: { getUserById: async () => ({ data: { user: { email: auth.email } }, error: null }) } } }), getActiveWorkspaceId: vi.fn(), getPromptTemplate: vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); auth.email = "member@example.invalid"; });
const rows = () => [modelRow("flare"), modelRow("sunburst"), ...RECRAFT_MODELS.map((model, index) => ({ ...modelRow("sunburst"), id: model.id,
  model_id: model.id, provider: "recraft", display_name: model.label, sort_order: index + 10, metadata: { providerModelId: model.id, description: "Private pilot" } }))];
const input = (model = "recraftv4_1", images: string[] = []) => ({ model, prompt: "A small blue chair", size: "1024x1024", images });

describe("Recraft private admission and Engine pricing", () => {
  it("recognizes every native variant and preserves the OpenAI default and configured prices", () => {
    expect(RECRAFT_MODELS).toHaveLength(21);
    for (const model of RECRAFT_MODELS) {
      const parsed = parseV1ImageRequest({ ...imazhRequest, model: model.id, selections: { model: model.id } });
      const config = resolveV1ImageModel(rows(), "maro_imazh", parsed.logicalModel);
      expect(config).toMatchObject({ provider: "recraft", providerModelId: model.id, customerCredits: 7 });
    }
    expect(resolveV1ImageModel(rows(), "maro_imazh").logicalModel).toBe("flare");
  });
  it("enforces the verified account even for a forged direct request", async () => {
    const parsed = parseV1ImageRequest({ ...imazhRequest, model: "recraftv4_1", selections: { model: "recraftv4_1" } });
    const dependencies = { loadModels: async () => rows(), resolveWorkspace: vi.fn(async () => null), resolveReference: vi.fn(), loadPreset: vi.fn() };
    await expect(resolveV1ImageRequest(parsed, "other", dependencies)).rejects.toMatchObject({ status: 403, code: "model_not_allowed" });
    expect(dependencies.resolveWorkspace).not.toHaveBeenCalled();
    auth.email = "erzen@nice.al";
    expect((await resolveV1ImageRequest(parsed, "owner", dependencies)).snapshot.model.provider).toBe("recraft");
    expect(canUseRecraft(" erzen@nice.al ")).toBe(true);
    expect(canUseRecraft("erzen@nice.al.attacker.invalid")).toBe(false);
  });
  it("supports editable credits and enabled filters without changing provider identities", () => {
    const source = rows();
    const edits = source.map((row) => publicV1ImageModel(readV1ImageModelConfiguration(row, "maro_imazh")));
    edits[2].customerCredits = 11; edits[3].enabled = false;
    expect(validateModelEdits(edits, "maro_imazh", source)[2].customerCredits).toBe(11);
    expect(() => resolveV1ImageModel(source.map((row, i) => i === 2 ? { ...row, enabled: false } : row), "maro_imazh", "recraftv4_1")).toThrow("model_disabled");
    edits[0].isDefault = false; edits[2].isDefault = true;
    expect(() => validateModelEdits(edits, "maro_imazh", source)).toThrow();
    expect(() => validateModelEdits(edits.slice(1), "maro_imazh", source)).toThrow();
    const forged = { ...source[2], metadata: { providerModelId: "https://attacker.invalid", description: "x" } };
    expect(() => readV1ImageModelConfiguration(forged, "maro_imazh")).toThrow();
    expect(() => parseV1ImageRequest({ ...imazhRequest, toolId: "logo", model: "recraftv4_1", selections: {} })).toThrow("model_not_allowed");
  });
});

describe("Recraft adapter contract", () => {
  const reference = "data:image/png;base64,TEST";
  it("maps native ratios and chooses image-to-image without discarding references", () => {
    expect(planRecraftImage({ ...input(), format: "ig-story" }).body.size).toBe("9:16");
    const edit = planRecraftImage(input("recraftv4_1", [reference]));
    expect(edit.endpoint).toBe("imageToImage"); expect(edit.body).toMatchObject({ image_url: reference, strength: 0.5 });
    expect(edit.body).not.toHaveProperty("size");
    expect(() => planRecraftImage(input("recraftv4_1", [reference, reference]))).toThrow("recraft_reference_limit");
  });
  it("checks model capabilities and exact compiled prompt boundaries before spend", () => {
    expect(() => planRecraftImage(input("recraftv4_1_flash", [reference]))).toThrow("recraft_references_unsupported");
    expect(() => planRecraftImage(input("recraftv4_styles"))).toThrow("recraft_style_reference_required");
    expect(planRecraftImage(input("recraftv4_styles", [reference])).body.style_reference_urls).toEqual([reference]);
    for (const model of RECRAFT_MODELS) {
      const limit = /^recraftv[23]/.test(model.id) ? 1000 : 10000;
      const base = input(model.id, model.id.includes("_styles") ? [reference] : []);
      expect(() => planRecraftImage({ ...base, prompt: "x".repeat(limit) })).not.toThrow();
      expect(() => planRecraftImage({ ...base, prompt: "x".repeat(limit + 1) })).toThrow("prompt_too_long");
    }
  });
  it("uses only Recraft auth, returns validated bytes and reports Recraft units without OpenAI rates", async () => {
    vi.stubEnv("RECRAFT_API_KEY", "test-private-key");
    const png = await sharp({ create: { width: 16, height: 16, channels: 3, background: "blue" } }).png().toBuffer();
    const fetch = vi.fn(async () => Response.json({ credits: 35, data: [{ b64_json: png.toString("base64") }] }));
    vi.stubGlobal("fetch", fetch); const observed = vi.fn();
    expect(await generateRecraftImage(planRecraftImage(input()), { onObservation: observed })).toEqual([png.toString("base64")]);
    expect(fetch).toHaveBeenCalledExactlyOnceWith("https://external.api.recraft.ai/v1/images/generations", expect.objectContaining({ redirect: "error", headers: { Authorization: "Bearer test-private-key", "Content-Type": "application/json" } }));
    expect(observed).toHaveBeenCalledWith(expect.objectContaining({ provider: "recraft", response: { apiUnits: 35 }, estimate: expect.objectContaining({ usd: null, rateVersion: "recraft-api-2026-10-18" }) }));
  });
  it("normalizes vector output to the existing PNG gallery contract and rejects active SVG", async () => {
    vi.stubEnv("RECRAFT_API_KEY", "test-private-key");
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="blue"/></svg>';
    const fetch = vi.fn(async () => Response.json({ data: [{ b64_json: Buffer.from(svg).toString("base64") }] })); vi.stubGlobal("fetch", fetch);
    const output = await generateRecraftImage(planRecraftImage(input("recraftv4_1_vector")));
    expect((await sharp(Buffer.from(output[0], "base64")).metadata()).format).toBe("png");
    fetch.mockImplementationOnce(async () => Response.json({ data: [{ b64_json: Buffer.from(svg.replace("<rect", "<script>alert(1)</script><rect")).toString("base64") }] }));
    await expect(generateRecraftImage(planRecraftImage(input("recraftv4_1_vector")))).rejects.toThrow("provider_output_invalid");
  });
  it("never retries paid requests or leaks error bodies, and rejects invalid output", async () => {
    vi.stubEnv("RECRAFT_API_KEY", "test-private-key");
    const fetch = vi.fn(async () => new Response("private prompt and test-private-key", { status: 429 })); vi.stubGlobal("fetch", fetch);
    await expect(generateRecraftImage(planRecraftImage(input()))).rejects.toThrow("recraft_provider_failed");
    expect(fetch).toHaveBeenCalledTimes(1);
    fetch.mockImplementationOnce(async () => Response.json({ data: [{ url: "https://attacker.invalid" }] }));
    await expect(generateRecraftImage(planRecraftImage(input()))).rejects.toThrow("provider_output_invalid");
    fetch.mockImplementationOnce(async () => new Response("{}", { headers: { "content-length": String(40 * 1024 * 1024) } }));
    await expect(generateRecraftImage(planRecraftImage(input()))).rejects.toThrow("provider_output_invalid");
  });
});
