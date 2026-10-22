import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.hoisted(() => vi.fn());
vi.mock("@supabase/ssr", () => ({ createServerClient: auth }));
// Exercise the boundary independently of whether production is currently open.
vi.mock("@/lib/maintenance", async importOriginal => {
  const actual = await importOriginal<typeof import("@/lib/maintenance")>();
  return { ...actual, maintenanceResponse: (req: NextRequest, enabled = true) => actual.maintenanceResponse(req, enabled) };
});

import { maintenanceResponse } from "@/lib/maintenance";
import { middleware } from "@/middleware";

function request(path: string, method = "GET") {
  return new NextRequest(`https://maro.al${path}`, { method, headers: {
    cookie: "sb-session=existing-session",
    authorization: "Bearer existing-session",
    "x-maro-launch-gate": "0",
    "x-maro-maintenance": "0",
  } });
}

describe("temporary maintenance boundary", () => {
  it.each(["/", "/imazh", "/chat", "/admin", "/sign-in", "/coming-soon", "/preview-runtime"])("closes %s before session checks", async path => {
    const response = await middleware(request(path));
    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("retry-after")).toBe("300");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(await response.text()).toContain("Technical update coming soon");
    expect(auth).not.toHaveBeenCalled();
  });

  it.each(["GET", "POST", "PUT", "DELETE", "OPTIONS"])("blocks %s API calls and new work", async method => {
    const response = await middleware(request("/api/ai/generate", method));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "maintenance", message: "Technical update coming soon" });
    expect(auth).not.toHaveBeenCalled();
  });

  it("returns an empty HEAD and a separate successful health probe", async () => {
    const head = await middleware(request("/imazh", "HEAD"));
    expect(head.status).toBe(503);
    expect(await head.text()).toBe("");
    const health = await middleware(request("/api/health"));
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ status: "ok", maintenance: true });
    expect((await middleware(request("/api/health", "POST"))).status).toBe(503);
  });

  it("retains existing authenticated reconciliation and payment settlement handlers only", () => {
    for (const path of ["/api/cron/reconcile-stale-jobs", "/api/cron/raiaccept-reconcile", "/api/webhooks/supabase/auth-email", "/api/payments/raiaccept/webhook"]) {
      expect(maintenanceResponse(request(path, "POST"))).toBeNull();
    }
    for (const path of ["/api/payments/raiaccept/checkout", "/api/payments/raiaccept/webhook/extra", "/api/mcp", "/api/mcp/image.png", "/api/brain", "/api/cron-spoof"]) {
      expect(maintenanceResponse(request(path, "POST"))?.status).toBe(503);
    }
  });

  it("can restore ordinary routing with the single maintenance flag", () => {
    expect(maintenanceResponse(request("/"), false)).toBeNull();
    expect(maintenanceResponse(request("/api/ai/generate", "POST"), false)).toBeNull();
  });
});
