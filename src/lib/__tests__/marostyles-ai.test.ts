import { beforeEach, describe, expect, it, vi } from "vitest";
import { expandStyle, moderateStyle } from "@/lib/moods/ai";
const mock = vi.hoisted(() => ({ moderation: vi.fn(), response: vi.fn(), config: vi.fn() }));
vi.mock("openai", () => ({ default: class { constructor(config: unknown) { mock.config(config); } moderations = { create: mock.moderation }; responses = { create: mock.response }; } }));
beforeEach(() => {
  vi.clearAllMocks(); process.env.MARO_STYLES_OPENAI_API_KEY = "synthetic-test-key";
  mock.moderation.mockResolvedValue({ results: [{ flagged: false }] });
  mock.response.mockResolvedValue({ status: "completed", output_text: "Warm golden light around the original subject.", usage: { input_tokens: 15, output_tokens: 20 } });
});
describe("server-only style preparation", () => {
  it("uses bounded non-stored output, sends the original input as data and moderates the result", async () => {
    const result = await expandStyle("Golden Hour", "Dritë e ngrohtë");
    expect(result).toMatchObject({ prompt: "Warm golden light around the original subject.", input_tokens: 15, output_tokens: 20 });
    const request = mock.response.mock.calls[0][0];
    expect(request).toMatchObject({ store: false, max_output_tokens: 1400 });
    expect(JSON.parse(request.input)).toEqual({ title: "Golden Hour", creative_brief: "Dritë e ngrohtë" });
    expect(mock.config).toHaveBeenCalledWith(expect.objectContaining({ maxRetries: 0, timeout: 45_000 }));
    expect(mock.moderation).toHaveBeenCalledTimes(2);
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
    mock.response.mockResolvedValue({ status, output_text: "partial text" });
    await expect(expandStyle("Title", "Creative brief")).rejects.toMatchObject({ status: 503 });
  });
  it("requires its dedicated server key even when a shared key exists", async () => {
    process.env.MARO_STYLES_OPENAI_API_KEY = "";
    process.env.OPENAI_API_KEY = "shared-synthetic-key";
    try {
      await expect(expandStyle("Title", "Creative brief")).rejects.toMatchObject({ status: 503 });
      expect(mock.response).not.toHaveBeenCalled();
    } finally { process.env.OPENAI_API_KEY = ""; }
  });
});
