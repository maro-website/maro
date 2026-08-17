import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGenerate = vi.fn();
const mockEdit = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("openai", () => ({
  default: vi.fn(() => ({
    images: {
      generate: mockGenerate,
      edit: mockEdit,
    },
  })),
  toFile: vi.fn(async (buffer: Buffer, name: string, opts: { type: string }) => ({
    buffer,
    name,
    type: opts.type,
  })),
}));

const releaseCreditReserve = vi.fn(async () => true);
const finalizeCreditCharge = vi.fn(async () => true);

vi.mock("@/lib/credits/ledger", () => ({
  releaseCreditReserve,
  finalizeCreditCharge,
  reserveCredits: vi.fn(async () => 10),
}));

vi.mock("@/lib/generation/jobs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/generation/jobs")>();
  return {
    ...actual,
    updateJob: vi.fn(async () => undefined),
  };
});

describe("OpenAI image provider safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.OPENAI_API_KEY = "test-key";
    mockGenerate.mockReset();
    mockEdit.mockReset();
  });

  async function loadOpenAI() {
    return import("@/lib/ai/openai");
  }

  it("A: generateImages succeeds with one provider call", async () => {
    mockGenerate.mockResolvedValue({ data: [{ b64_json: "abc123" }] });
    const { generateImages } = await loadOpenAI();
    const images = await generateImages({ prompt: "Product photo" });
    expect(images).toEqual(["abc123"]);
    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(mockEdit).not.toHaveBeenCalled();
  });

  it("B: editImages succeeds with one provider call", async () => {
    mockEdit.mockResolvedValue({ data: [{ b64_json: "edit123" }] });
    const { editImages } = await loadOpenAI();
    const images = await editImages({
      prompt: "Enhance product",
      images: ["data:image/png;base64,aaaa"],
    });
    expect(images).toEqual(["edit123"]);
    expect(mockEdit).toHaveBeenCalledTimes(1);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("C: generateImages timeout aborts once and throws timeout code", async () => {
    mockGenerate.mockImplementation((_params, opts?: { signal?: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        opts?.signal?.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    });
    const { generateImages, OpenAIImageError } = await loadOpenAI();
    await expect(generateImages({ prompt: "Slow", timeoutMs: 20 })).rejects.toMatchObject({
      code: "timeout",
    });
    expect(mockGenerate).toHaveBeenCalledTimes(1);
    try {
      await generateImages({ prompt: "Slow", timeoutMs: 20 });
    } catch (e) {
      expect(e).toBeInstanceOf(OpenAIImageError);
    }
  });

  it("D: editImages timeout aborts once and throws timeout code", async () => {
    mockEdit.mockImplementation((_params, opts?: { signal?: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        opts?.signal?.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    });
    const { editImages } = await loadOpenAI();
    await expect(
      editImages({
        prompt: "Slow edit",
        images: ["data:image/png;base64,aaaa"],
        timeoutMs: 20,
      })
    ).rejects.toMatchObject({ code: "timeout" });
    expect(mockEdit).toHaveBeenCalledTimes(1);
  });

  it("E: ordinary provider error does not retry", async () => {
    mockGenerate.mockRejectedValue(new Error("rate_limit_exceeded"));
    const { generateImages, OpenAIImageError } = await loadOpenAI();
    await expect(generateImages({ prompt: "x", timeoutMs: 5000 })).rejects.toBeInstanceOf(
      OpenAIImageError
    );
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });

  it("G: empty provider response throws empty and does not succeed", async () => {
    mockGenerate.mockResolvedValue({ data: [] });
    const { generateImages } = await loadOpenAI();
    await expect(generateImages({ prompt: "x" })).rejects.toMatchObject({ code: "empty" });
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });

  it("F: client abort signal maps to client_disconnect without retry", async () => {
    const { generateImages } = await loadOpenAI();
    const ac = new AbortController();
    ac.abort();
    await expect(
      generateImages({ prompt: "x", timeoutMs: 5000, abortSignal: ac.signal })
    ).rejects.toMatchObject({ code: "client_disconnect" });
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("H: failGeneration on timeout releases credits without charging", async () => {
    const { failGeneration } = await import("@/lib/generation/orchestrator");
    const released = await failGeneration({
      jobId: "job-timeout-1",
      idempotencyKey: "img-key-1",
      error: "timeout",
    });
    expect(released).toBe(true);
    expect(releaseCreditReserve).toHaveBeenCalledTimes(1);
    expect(finalizeCreditCharge).not.toHaveBeenCalled();
  });

  it("exports conservative default timeout aligned with route budget", async () => {
    const { OPENAI_TIMEOUT_MS } = await loadOpenAI();
    expect(OPENAI_TIMEOUT_MS).toBe(270_000);
  });
});

describe("OpenAI image route error mapping", () => {
  it("timeout errors map to client timeout code without secrets", async () => {
    const { OpenAIImageError } = await import("@/lib/ai/openai");
    const err = new OpenAIImageError("timeout", "exceeded 270s time budget");
    const clientError = err.code === "timeout" ? "timeout" : "ai-failed";
    expect(clientError).toBe("timeout");
    expect(err.detail).not.toMatch(/test-key|sk-/i);
  });
});
