import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateImages, ImageGenerationError } from "@/lib/services/imageService";
import { createImageDraftAcceptance } from "@/lib/services/imageDraft";
import { imageErrorMessage } from "@/lib/services/imageErrors";

vi.mock("@/lib/supabase/client", () => ({ getAccessToken: vi.fn(async () => "test") }));
const request = { toolId: "reklama" as const, prompt: "long private draft", attachments: ["storage:generations/user/a.png"] };
const sse = (...events: unknown[]) => new Response(events.map((value) => `data: ${JSON.stringify(value)}\n\n`).join(""), { headers: { "Content-Type": "text/event-stream" } });
const success = { ok: true, images: ["signed-preview"], creditsSpent: 5 };
function draft() {
  let prompt = request.prompt;
  let attachments = [{ id: "a", storageRef: request.attachments[0], previewUrl: "private-preview" }];
  const accept = createImageDraftAcceptance({ prompt, attachments,
    setPrompt: (update) => { prompt = update(prompt); }, setAttachments: (update) => { attachments = update(attachments); } });
  return { accept, read: () => ({ prompt, attachments }), edit: () => {
    prompt = "next draft"; attachments.push({ id: "b", storageRef: "storage:generations/user/b.png", previewUrl: "next-preview" });
  } };
}
beforeEach(() => { vi.spyOn(console, "warn").mockImplementation(() => undefined); });
afterEach(() => { vi.restoreAllMocks(); });

describe("image validation diagnostics", () => {
  it("preserves only safe fields from HTTP errors, including the server message for debugging", async () => {
    const details = { error: "prompt_too_long", field: "prompt", message: "Prompt exceeds the limit", requestId: "req-1",
      userPromptLength: 30000, compiledPromptLength: 32001, maxCompiledPromptLength: 32000,
      prompt: "PRIVATE", stack: "SECRET STACK", configuration: { master: "PRIVATE" } };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(details, { status: 400 }));
    const error = await generateImages(request).catch((e) => e);
    expect(error).toBeInstanceOf(ImageGenerationError);
    expect(error).toMatchObject({ code: "prompt_too_long", status: 400, field: "prompt", message: details.message,
      diagnostics: { requestId: "req-1", userPromptLength: 30000, compiledPromptLength: 32001, maxCompiledPromptLength: 32000 } });
    expect(JSON.stringify(error.diagnostics)).not.toMatch(/PRIVATE|STACK|configuration/);
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toMatch(/PRIVATE|STACK|Prompt exceeds/);
  });
  it("preserves structured SSE failure fields and technical codes", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(sse({ ok: false, error: "provider_failed", jobId: "job-1", field: "prompt", requestId: "req-1" }));
    await expect(generateImages(request)).rejects.toMatchObject({ code: "provider_failed", field: "prompt", diagnostics: { jobId: "job-1", requestId: "req-1" } });
  });
  it.each([
    ["prompt_too_long", "Përshkrimi është shumë i gjatë. Shkurtoje pak dhe provo përsëri."],
    ["invalid_string", "Kërkesa nuk mund të përpunohet. Provo përsëri."],
    ["invalid_request", "Kërkesa nuk mund të përpunohet. Provo përsëri."],
    ["unknown_internal_error", "Kërkesa nuk mund të përpunohet. Provo përsëri."],
    ["provider_failed", "Gjenerimi dështoi. Provo përsëri."],
  ])("maps %s without exposing developer detail", (code, message) => { expect(imageErrorMessage(code)).toBe(message); });
});

describe("draft preservation through the real client request lifecycle", () => {
  it.each(["invalid_string", "prompt_too_long", "request_configuration_unavailable", "no-key"])("retains text and references on %s", async (error) => {
    const state = draft(); const before = structuredClone(state.read());
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ error, field: "prompt" }, { status: 400 }));
    await expect(generateImages(request, { onStarted: state.accept })).rejects.toBeInstanceOf(ImageGenerationError);
    expect(state.read()).toEqual(before);
  });
  it("retains drafts on transport failure and a pre-provider stream failure", async () => {
    const state = draft(); const before = structuredClone(state.read());
    const fetch = vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("offline"));
    await expect(generateImages(request, { onStarted: state.accept })).rejects.toThrow("offline");
    fetch.mockResolvedValueOnce(sse({ ok: false, error: "execution_trace_unavailable" }));
    await expect(generateImages(request, { onStarted: state.accept })).rejects.toThrow();
    expect(state.read()).toEqual(before);
  });
  it("does not clear on SSE headers; clears only after a started event, even across chunks", async () => {
    const state = draft(); let controller!: ReadableStreamDefaultController<Uint8Array>;
    const stream = new ReadableStream<Uint8Array>({ start(c) { controller = c; } });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(stream, { headers: { "Content-Type": "text/event-stream" } }));
    const started = vi.fn(state.accept);
    const pending = generateImages(request, { onStarted: started });
    const encoder = new TextEncoder();
    controller.enqueue(encoder.encode(': ping\n\ndata: {"event":"generation_'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(state.read().prompt).toBe(request.prompt);
    expect(started).not.toHaveBeenCalled();
    controller.enqueue(encoder.encode('started","jobId":"job-1"}\n\n'));
    await vi.waitFor(() => expect(started).toHaveBeenCalledOnce());
    expect(state.read()).toEqual({ prompt: "", attachments: [] });
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(success)}\n\n`)); controller.close();
    await expect(pending).resolves.toMatchObject({ images: success.images });
    expect(started).toHaveBeenCalledOnce();
  });
  it("preserves edits/new attachments made during preflight and handles legacy success", async () => {
    const state = draft(); state.edit();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(sse(success));
    await generateImages(request, { onStarted: state.accept });
    expect(state.read()).toMatchObject({ prompt: "next draft", attachments: [{ id: "b" }] });
  });
  it("a failure after admission leaves the admitted draft cleared", async () => {
    const state = draft();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(sse({ event: "generation_started", jobId: "job" }, { ok: false, error: "provider_failed" }));
    await expect(generateImages(request, { onStarted: state.accept })).rejects.toMatchObject({ code: "provider_failed" });
    expect(state.read()).toEqual({ prompt: "", attachments: [] });
  });
  it("a second rejected submission retains its draft and does not reuse the first result or request identity", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(sse(success))
      .mockResolvedValueOnce(Response.json({ error: "prompt_too_long", field: "prompt" }, { status: 400 }));
    const first = draft();
    await generateImages(request, { onStarted: first.accept });
    const second = draft();
    await expect(generateImages(request, { onStarted: second.accept })).rejects.toMatchObject({ code: "prompt_too_long" });
    expect(second.read().prompt).toBe(request.prompt);
    expect(second.read().attachments).toHaveLength(1);
    const bodies = fetch.mock.calls.map(([, init]) => JSON.parse(init!.body as string));
    expect(bodies[0].idempotencyKey).not.toBe(bodies[1].idempotencyKey);
    expect(bodies[1].attachments).toEqual(request.attachments);
    expect(JSON.stringify(bodies[1])).not.toContain("signed-preview");
  });
});
