import { beforeEach, describe, expect, it, vi } from "vitest";
import { expandStyle, moderateStyle } from "@/lib/moods/ai";
const mock = vi.hoisted(() => ({ moderation: vi.fn(), response: vi.fn(), config: vi.fn() }));
vi.mock("openai", () => ({ default: class { constructor(config: unknown) { mock.config(config); } moderations = { create: mock.moderation }; responses = { create: mock.response }; } }));
const output = { prompt: "Warm golden light around the original subject.", description: "Dritë e artë, tone të ngrohta dhe hije të buta krijojnë një atmosferë të qetë e verore." };
beforeEach(() => {
  vi.clearAllMocks(); process.env.MARO_STYLES_OPENAI_API_KEY = "synthetic-test-key";
  mock.moderation.mockResolvedValue({ results: [{ flagged: false }] });
  mock.response.mockResolvedValue({ status: "completed", output_text: JSON.stringify(output), usage: { input_tokens: 15, output_tokens: 20 } });
});
describe("server-only style preparation", () => {
  it("generates a distinct public description and private prompt in one bounded, non-stored call", async () => {
    const input = "  Dritë e ngrohtë\nMe hije të buta  ";
    const result = await expandStyle("Golden Hour", input);
    expect(result).toMatchObject({ ...output, input_tokens: 15, output_tokens: 20 });
    const request = mock.response.mock.calls[0][0];
    expect(request).toMatchObject({ store: false, max_output_tokens: 1400, text: { format: { type: "json_schema", strict: true, schema: { required: ["prompt", "description"], additionalProperties: false } } } });
    expect(JSON.parse(request.input)).toEqual({ title: "Golden Hour", creative_brief: input });
    expect(mock.config).toHaveBeenCalledWith(expect.objectContaining({ maxRetries: 0, timeout: 45_000 }));
    expect(mock.moderation).toHaveBeenCalledTimes(2);
    expect(mock.moderation.mock.calls[1][0].input).toEqual([{ type: "text", text: `${output.description}\n${output.prompt}` }]);
  });
  it("does not expand flagged input", async () => {
    mock.moderation.mockResolvedValue({ results: [{ flagged: true }] });
    await expect(expandStyle("Title", "Flagged content")).rejects.toMatchObject({ message: "style_content_rejected", status: 422 });
    expect(mock.response).not.toHaveBeenCalled();
  });
  it("sends image data directly to moderation without public hosting", async () => {
    await moderateStyle("Thumbnail", "data:image/webp;base64,SYNTHETIC");
    expect(mock.moderation).toHaveBeenCalledWith({ model: "omni-moderation-latest", input: [{ type: "text", text: "Thumbnail" }, { type: "image_url", image_url: { url: "data:image/webp;base64,SYNTHETIC" } }] });
  });
  it("fails closed if moderation produces no verdict", async () => {
    mock.moderation.mockResolvedValue({ results: [] });
    await expect(moderateStyle("Text")).rejects.toMatchObject({ status: 503 });
  });
  it.each(["incomplete", "failed"])("rejects %s output", async status => {
    mock.response.mockResolvedValue({ status, output_text: JSON.stringify(output) });
    await expect(expandStyle("Title", "Creative brief")).rejects.toMatchObject({ status: 503 });
  });
  it.each(["not JSON", JSON.stringify({ prompt: "Only a prompt" }), JSON.stringify({ ...output, description: "" }), JSON.stringify({ ...output, description: "a".repeat(181) }), JSON.stringify({ ...output, extra: "provider data" })])("rejects malformed or incomplete editorial output", async text => {
    mock.response.mockResolvedValue({ status: "completed", output_text: text });
    await expect(expandStyle("Title", "Creative brief")).rejects.toMatchObject({ message: "styles_ai_unavailable", status: 503 });
    expect(mock.moderation).toHaveBeenCalledTimes(1);
  });
  it("rejects a copied request instead of publishing it as the description", async () => {
    mock.response.mockResolvedValue({ status: "completed", output_text: JSON.stringify(output) });
    await expect(expandStyle("Title", output.description + " Edhe një kërkesë tjetër.")).rejects.toMatchObject({ status: 503 });
  });
  it("normalizes the public description into a single line", async () => {
    mock.response.mockResolvedValue({ status: "completed", output_text: JSON.stringify({ ...output, description: "Dritë e artë,\n tone të ngrohta dhe hije të buta krijojnë një atmosferë të qetë e verore." }) });
    expect((await expandStyle("Title", "Creative brief")).description).toBe(output.description);
  });
  it("rejects flagged generated content before returning either field", async () => {
    mock.moderation.mockResolvedValueOnce({ results: [{ flagged: false }] }).mockResolvedValueOnce({ results: [{ flagged: true }] });
    await expect(expandStyle("Title", "Creative brief")).rejects.toMatchObject({ message: "style_content_rejected", status: 422 });
  });
  it("requires its dedicated server key even when a shared key exists", async () => {
    process.env.MARO_STYLES_OPENAI_API_KEY = ""; process.env.OPENAI_API_KEY = "shared-synthetic-key";
    try {
      await expect(expandStyle("Title", "Creative brief")).rejects.toMatchObject({ status: 503 });
      expect(mock.response).not.toHaveBeenCalled();
    } finally { process.env.OPENAI_API_KEY = ""; }
  });
});
