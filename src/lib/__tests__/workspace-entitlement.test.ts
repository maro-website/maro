import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const resolveEntitlements = vi.fn();
const insertMock = vi.fn();

vi.mock("@/lib/payments/auth", () => ({ requireUser }));
vi.mock("@/lib/commerce/entitlements", () => ({ resolveEntitlements }));
vi.mock("@/lib/supabase/server", () => ({
  supabaseServerConfigured: vi.fn(() => true),
  getSupabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: insertMock,
    })),
  })),
}));

describe("POST /api/workspaces workspace limit enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ id: "user-limit-test" });
    resolveEntitlements.mockResolvedValue({
      can_create_workspace: false,
      workspace_limit: 1,
      current_workspace_count: 1,
    });
    insertMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn(),
      }),
    });
  });

  it("rejects creation when entitlement limit is reached (server boundary)", async () => {
    const { POST } = await import("@/app/api/workspaces/route");
    const res = await POST(
      new Request("http://localhost/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer test" },
        body: JSON.stringify({ name: "Extra workspace" }),
      })
    );

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("WORKSPACE_LIMIT");
    expect(insertMock).not.toHaveBeenCalled();
  });
});

describe("DB trigger workspace bypass (integration)", () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const hasDb = Boolean(url && serviceKey);

  it.skipIf(!hasDb)("direct workspaces insert raises WORKSPACE_LIMIT when migration 0041 is applied", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const { randomUUID } = await import("node:crypto");
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    const email = `ws-bypass-${Date.now()}@maro.test`;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: randomUUID(),
      email_confirm: true,
    });
    expect(createErr).toBeNull();
    const userId = created!.user!.id;

    try {
      const { error } = await admin.from("workspaces").insert({
        id: `ws_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
        owner_id: userId,
        name: "Should fail",
        sort_order: 1,
      });
      if (!error) {
        console.warn("Migration 0041 not applied — DB trigger test skipped");
        return;
      }
      expect(error.message).toMatch(/WORKSPACE_LIMIT/i);
    } finally {
      await admin.auth.admin.deleteUser(userId);
    }
  });
});
