import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { MARO_IMAGE_RESULT_HTML } from "@/lib/mcp/imageResultUi";

function preview() {
  const events = new Map<string, (event?: unknown) => void>();
  const imageEvents = new Map<string, () => void>();
  const image = { hidden: true, src: "", addEventListener: (name: string, fn: () => void) => imageEvents.set(name, fn) };
  const status = { hidden: false, textContent: "Loading the Maro image…" };
  const meta = { hidden: true };
  const credits = { textContent: "" };
  const parent = { postMessage: vi.fn() };
  const elements = { image, status, meta, credits };
  const script = MARO_IMAGE_RESULT_HTML.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  if (!script) throw new Error("Missing preview script");
  runInNewContext(script, {
    URL,
    document: { getElementById: (id: keyof typeof elements) => elements[id], body: { getBoundingClientRect: () => ({ height: 500 }) } },
    window: { parent, addEventListener: (name: string, fn: (event?: unknown) => void) => events.set(name, fn) },
  });
  const message = (data: unknown, source: unknown = parent) => events.get("message")?.({ source, data });
  const initialize = () => message({ jsonrpc: "2.0", id: "maro-image-ui-initialize", result: { protocolVersion: "2026-01-26" } });
  const result = (output: Record<string, unknown>) => message({ jsonrpc: "2.0", method: "ui/notifications/tool-result", params: { structuredContent: output } });
  return { ...elements, parent, message, initialize, result, load: () => imageEvents.get("load")?.(), fail: () => imageEvents.get("error")?.() };
}

describe("Maro inline image result bridge", () => {
  it("initializes the MCP Apps connection before the host delivers results", () => {
    const ui = preview();
    expect(ui.parent.postMessage).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ method: "ui/initialize", params: expect.objectContaining({ protocolVersion: "2026-01-26" }) }), "*");
    ui.initialize();
    expect(ui.parent.postMessage).toHaveBeenCalledWith({ jsonrpc: "2.0", method: "ui/notifications/initialized", params: {} }, "*");
  });

  it("shows the actual completed image only after loading and reports its height", () => {
    const ui = preview();
    ui.initialize();
    ui.result({ asset_url: "https://images.example.test/generated.png", credits_spent: 5 });
    expect(ui.image.src).toBe("https://images.example.test/generated.png");
    expect(ui.image.hidden).toBe(true);
    ui.load();
    expect(ui.image.hidden).toBe(false);
    expect(ui.status.hidden).toBe(true);
    expect(ui.meta.hidden).toBe(false);
    expect(ui.credits.textContent).toBe("5 credits used");
    expect(ui.parent.postMessage).toHaveBeenCalledWith({ jsonrpc: "2.0", method: "ui/notifications/size-changed", params: { height: 500 } }, "*");
  });

  it("handles a pending result followed by the completed status result without generating again", () => {
    const ui = preview();
    ui.initialize();
    ui.result({ error: "GENERATION_IN_PROGRESS", job_id: "owned-job" });
    expect(ui.status.textContent).toContain("still being generated");
    expect(ui.image.hidden).toBe(true);
    ui.result({ status: "completed", asset_url: "https://images.example.test/finished.png" });
    ui.load();
    expect(ui.image.hidden).toBe(false);
    expect(ui.image.src).toBe("https://images.example.test/finished.png");
    expect(ui.parent.postMessage.mock.calls.some(([message]) => message.method === "tools/call")).toBe(false);
  });

  it("ignores messages outside the parent and refuses unsafe image URLs", () => {
    const ui = preview();
    ui.message({ jsonrpc: "2.0", method: "ui/notifications/tool-result", params: { structuredContent: { asset_url: "https://images.example.test/untrusted.png" } } }, {});
    expect(ui.image.src).toBe("");
    for (const asset_url of ["javascript:alert(1)", "data:image/png;base64,AAAA", "http://images.example.test/unsafe.png"]) {
      ui.result({ asset_url });
      expect(ui.image.src).toBe("");
    }
  });

  it("shows load failures and cancelled calls without claiming an image is visible", () => {
    const ui = preview();
    ui.result({ asset_url: "https://images.example.test/expired.png" });
    ui.fail();
    expect(ui.status.textContent).toContain("could not be loaded");
    expect(ui.image.hidden).toBe(true);
    ui.message({ jsonrpc: "2.0", method: "ui/notifications/tool-cancelled", params: {} });
    expect(ui.status.textContent).toContain("cancelled");
  });
});
