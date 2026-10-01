import { describe, expect, it, vi } from "vitest";
import { readJsonBody } from "@/lib/security/requestLimits";

describe("streamed request limits", () => {
  it("cancels an oversized chunked body before consuming the remaining stream", async () => {
    const cancelled = vi.fn();
    let pulls = 0;
    const body = new ReadableStream({
      pull(controller) { pulls++; controller.enqueue(new Uint8Array(33)); },
      cancel: cancelled,
    }, { highWaterMark: 0 });
    const req = new Request("http://localhost", { method: "POST", body, duplex: "half" } as RequestInit);
    const result = await readJsonBody(req, 32);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(413);
    expect(cancelled).toHaveBeenCalledOnce();
    expect(pulls).toBe(1);
  });
  it("measures UTF-8 bytes, including split code points", async () => {
    const data = new TextEncoder().encode('{"text":"ëë"}');
    const stream = new ReadableStream({ start(c) { c.enqueue(data.slice(0, 10)); c.enqueue(data.slice(10)); c.close(); } });
    const req = new Request("http://localhost", { method: "POST", body: stream, duplex: "half" } as RequestInit);
    expect(await readJsonBody(req, data.length)).toEqual({ ok: true, body: { text: "ëë" } });
    const oversized = await readJsonBody(new Request("http://localhost", { method: "POST", body: '{"text":"ëë"}' }), data.length - 1);
    expect(oversized.ok).toBe(false);
    if (!oversized.ok) expect(oversized.response.status).toBe(413);
  });
});
