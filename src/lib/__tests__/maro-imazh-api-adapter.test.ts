import { beforeEach, describe, expect, it, vi } from "vitest";

const executeMaroImageApplication = vi.hoisted(() => vi.fn());

vi.mock("@/lib/maro-imazh/applicationService", () => ({
  executeMaroImageApplication,
}));

import { POST } from "@/app/api/ai/image/route";

function request() {
  return new Request("https://maro.test/api/ai/image", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ toolId: "reklama", prompt: "Studio product image" }),
  });
}

describe("maroImazh API adapter characterization", () => {
  beforeEach(() => vi.clearAllMocks());

  it("preserves the existing SSE result envelope and headers", async () => {
    executeMaroImageApplication.mockImplementation(async (_req, _body, adapter) =>
      adapter.stream(async (send: (payload: Record<string, unknown>) => void) => {
        send({
          ok: true,
          images: ["https://cdn.maro.test/image.png"],
          generationId: "generation-1",
          storageRefs: ["storage:generations/user-1/image.png"],
          creditsSpent: 5,
          jobId: "job-1",
        });
      })
    );

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/event-stream; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("no-cache, no-transform");
    expect(await response.text()).toBe(
      'data: {"ok":true,"images":["https://cdn.maro.test/image.png"],"generationId":"generation-1","storageRefs":["storage:generations/user-1/image.png"],"creditsSpent":5,"jobId":"job-1"}\n\n'
    );
  });

  it("preserves pre-stream validation status codes", async () => {
    executeMaroImageApplication.mockImplementation(async (_req, _body, adapter) =>
      adapter.failure({ error: "missing-prompt" }, 400)
    );

    const response = await POST(request());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "missing-prompt" });
  });
});
