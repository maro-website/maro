import { describe, expect, it } from "vitest";
import { estimateV1ImageCost } from "@/lib/cost/v1ImageCost";
import { buildImageObservation } from "@/lib/ai/imageObservation";

describe("V1 image usage estimates", () => {
  it.each([
    ["gpt-image-2.5-flare", "openai-image-2.5-2026-09-17"],
    ["gpt-image-2.5-sunburst", "openai-image-2.5-2026-09-17"],
    ["gpt-image-2.6-flare", "openai-image-2.6-2026-11-04"],
    ["gpt-image-2.6-sunburst", "openai-image-2.6-2026-11-04"],
  ])("uses published token rates for %s", (model, rateVersion) => {
    const estimate = estimateV1ImageCost(model, { input_tokens: 300, input_tokens_details: { text_tokens: 100, image_tokens: 200 }, output_tokens: 1000 });
    expect(estimate.usd).toBe(0.0321);
    expect(estimate.source).toBe("usage_calculated");
    expect(estimate.rateVersion).toBe(rateVersion);
    expect(estimate.assumptions.join(" ")).toContain("not provider-reported money");
  });
  it.each([null, {}, { input_tokens: 10, output_tokens: 10 }, { input_tokens: 10, input_tokens_details: { text_tokens: -1, image_tokens: 11 }, output_tokens: 10 }, { input_tokens: 11, input_tokens_details: { text_tokens: 10, image_tokens: 0 }, output_tokens: 10 }])("does not invent a cost from incomplete usage %j", (usage) => {
    expect(estimateV1ImageCost("gpt-image-2.5-flare", usage).usd).toBeNull();
  });
  it("does not count reported text output as image output", () => {
    expect(estimateV1ImageCost("gpt-image-2.5-flare", { input_tokens: 0, input_tokens_details: { text_tokens: 0, image_tokens: 0 }, output_tokens: 1010, output_tokens_details: { image_tokens: 1000, text_tokens: 10 } }).usd).toBe(0.03);
  });
});

describe("provider observation", () => {
  it("accounts for SVG authoring separately from raster rendering", () => {
    const response = {
      usage: { input_tokens: 100, input_tokens_details: { text_tokens: 100, image_tokens: 0 }, output_tokens: 1000 },
      svg_usage: { model: "gpt-6-luna", input_tokens: 2000, output_tokens: 3000, private_content: "not retained" },
    };
    const request = { model: "gpt-image-2.6-flare", prompt: "test", operation: "generate" as const, outputFormat: "svg" as const, referenceCount: 0, startedAt: new Date().toISOString() };
    const observation = buildImageObservation({ ...request, response });
    expect(observation.estimate.usd).toBe(0.0322);
    expect(observation.response.svg_usage).toEqual({ model: "gpt-6-luna", input_tokens: 2000, output_tokens: 3000 });
    expect(buildImageObservation({ ...request, response: { usage: response.usage } }).estimate.usd).toBeNull();
  });
  it("distinguishes requested model, reported model, usage and estimated money; excludes image bytes", () => {
    const observation = buildImageObservation({ model: "gpt-image-2.5-flare", prompt: "private prompt", operation: "generate", referenceCount: 0, startedAt: new Date().toISOString(), response: {
      _request_id: "req_verified", data: [{ b64_json: "IMAGE_BYTES" }], created: 123,
      usage: { input_tokens: 1, input_tokens_details: { text_tokens: 1, image_tokens: 0 }, output_tokens: 100 },
    } });
    expect(observation.requestId).toBe("req_verified");
    expect(observation.reportedModel).toBeNull();
    expect(observation.providerReportedCostUsd).toBeNull();
    expect(observation.estimate.usd).toBe(0.003005);
    expect(observation.promptSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(observation)).not.toMatch(/IMAGE_BYTES|private prompt/);
  });
  it("retains provider failure diagnostics without credentials", () => {
    const observation = buildImageObservation({ model: "gpt-image-2.5-sunburst", prompt: "test", operation: "edit", referenceCount: 1, startedAt: new Date().toISOString(), error: { message: "provider_failed", detail: "Rejected sk-secret123", providerCode: "unsupported_model", requestId: "req_failure", status: 400 } });
    expect(observation.error).toEqual({ code: "unsupported_model", message: "Rejected [redacted]", status: 400 });
    expect(observation.requestId).toBe("req_failure");
    expect(observation.estimate.usd).toBeNull();
  });
});
