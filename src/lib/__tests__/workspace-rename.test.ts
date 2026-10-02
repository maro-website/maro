import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  configured: vi.fn(() => true),
  admin: vi.fn(),
  from: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  result: vi.fn(),
  token: vi.fn(),
  browser: vi.fn(),
}));
vi.mock("@/lib/payments/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/commerce/entitlements", () => ({ resolveEntitlements: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  supabaseServerConfigured: mocks.configured,
  getSupabaseAdmin: mocks.admin,
}));
vi.mock("@/lib/supabase/client", () => ({
  supabaseConfigured: true,
  getAccessToken: mocks.token,
  getSupabaseBrowser: mocks.browser,
}));

const row = { id: "ws-owner", owner_id: "owner", name: "Saved name", created_at: "2026-10-02" };
const request = (body: unknown) => new Request("https://maro.test/api/workspaces", {
  method: "PATCH",
  headers: { "Content-Type": "application/json", Authorization: "Bearer test-token" },
  body: JSON.stringify(body),
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.configured.mockReturnValue(true);
  mocks.requireUser.mockResolvedValue({ id: "owner" });
  mocks.token.mockResolvedValue("test-token");
  const query = { eq: mocks.eq, select: mocks.select, maybeSingle: mocks.result };
  mocks.admin.mockReturnValue({ from: mocks.from });
  mocks.from.mockReturnValue({ update: mocks.update });
  mocks.update.mockReturnValue(query);
  mocks.eq.mockReturnValue(query);
  mocks.select.mockReturnValue(query);
  mocks.result.mockResolvedValue({ data: row, error: null });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("authenticated workspace renaming", () => {
  it("updates only the name and scopes ownership to the verified token", async () => {
    const { PATCH } = await import("@/app/api/workspaces/route");
    const response = await PATCH(request({
      workspaceId: "ws-owner", name: " Saved name ", owner_id: "someone-else",
      brain_profile: { changed: true }, icon_url: "changed", brand_name: "changed",
    }));
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith({ name: "Saved name" });
    expect(mocks.eq.mock.calls).toEqual([["id", "ws-owner"], ["owner_id", "owner"]]);
    expect(await response.json()).toEqual({ workspace: row });
  });

  it("rejects unsigned requests before accessing the database", async () => {
    mocks.requireUser.mockResolvedValue(null);
    const { PATCH } = await import("@/app/api/workspaces/route");
    expect((await PATCH(request({ workspaceId: "ws-owner", name: "Name" }))).status).toBe(401);
    expect(mocks.admin).not.toHaveBeenCalled();
  });

  it("does not report success when the workspace is foreign or missing", async () => {
    mocks.result.mockResolvedValue({ data: null, error: null });
    const { PATCH } = await import("@/app/api/workspaces/route");
    const response = await PATCH(request({ workspaceId: "ws-foreign", name: "Name" }));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "workspace_not_found" });
    expect(mocks.eq).toHaveBeenCalledWith("owner_id", "owner");
  });

  it.each([null, [], {}, { workspaceId: "ws-owner", name: " " }, { workspaceId: "ws-owner", name: "a".repeat(201) }])(
    "rejects malformed/empty/oversized names before writing: %j", async (body) => {
      const { PATCH } = await import("@/app/api/workspaces/route");
      expect((await PATCH(request(body))).status).toBe(400);
      expect(mocks.update).not.toHaveBeenCalled();
    }
  );

  it("reports a failed database write without false success", async () => {
    mocks.result.mockResolvedValue({ data: null, error: { message: "internal failure" } });
    const { PATCH } = await import("@/app/api/workspaces/route");
    expect((await PATCH(request({ workspaceId: "ws-owner", name: "Name" }))).status).toBe(500);
  });
});

describe("workspace rename client transport", () => {
  it("saves via the app origin when direct Supabase PATCH requests cannot reach the server", async () => {
    const fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url !== "/api/workspaces") throw new TypeError("Failed to fetch");
      expect(init?.method).toBe("PATCH");
      expect(init?.headers).toEqual({ "Content-Type": "application/json", Authorization: "Bearer test-token" });
      expect(JSON.parse(String(init?.body))).toEqual({ workspaceId: "ws-owner", name: "Saved name" });
      return new Response(JSON.stringify({ workspace: row }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetch);
    const { updateWorkspace } = await import("@/lib/workspaces/service");
    expect(await updateWorkspace("owner", "ws-owner", { name: "Saved name" })).toMatchObject({
      id: "ws-owner", ownerId: "owner", name: "Saved name",
    });
    expect(mocks.browser).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("reports an expired session instead of treating the rename as saved", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 })));
    const { updateWorkspace } = await import("@/lib/workspaces/service");
    await expect(updateWorkspace("owner", "ws-owner", { name: "Name" })).rejects.toThrow("unauthorized");
  });

  it("does not send an update without an access token", async () => {
    mocks.token.mockResolvedValue(null);
    const fetch = vi.fn();vi.stubGlobal("fetch", fetch);
    const { updateWorkspace } = await import("@/lib/workspaces/service");
    await expect(updateWorkspace("owner", "ws-owner", { name: "Name" })).rejects.toThrow("unauthorized");
    expect(fetch).not.toHaveBeenCalled();
  });
});
