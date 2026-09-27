import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  supabaseServerConfigured: () => true,
  getSupabaseAdmin: () => ({
    from: () => ({ insert: mocks.insert }),
  }),
}));

vi.mock("@/lib/security/rateLimit", () => ({
  clientIp: () => "127.0.0.1",
  enforceRateLimit: mocks.rateLimit,
}));

import { POST } from "@/app/api/launch-waitlist/route";

function request(body: unknown): Request {
  return new Request("http://localhost/api/launch-waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("launch waitlist route", () => {
  beforeEach(() => {
    mocks.insert.mockReset();
    mocks.rateLimit.mockReset();
    mocks.rateLimit.mockResolvedValue({ allowed: true, retryAfter: 0 });
  });

  it("normalizes and stores a valid email without returning private data", async () => {
    mocks.insert.mockResolvedValue({ error: null });

    const response = await POST(request({ email: "  Person@Example.COM  " }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, duplicate: false });
    expect(mocks.insert).toHaveBeenCalledWith({
      email: "person@example.com",
      source: "coming_soon",
    });
  });

  it("handles a database-enforced duplicate as an existing signup", async () => {
    mocks.insert.mockResolvedValue({ error: { code: "23505" } });

    const response = await POST(request({ email: "person@example.com" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, duplicate: true });
  });

  it("rejects invalid input before touching the database", async () => {
    const response = await POST(request({ email: "not-an-email" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_email" });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("fails closed when the public rate limit is reached", async () => {
    mocks.rateLimit.mockResolvedValue({ allowed: false, retryAfter: 44 });

    const response = await POST(request({ email: "person@example.com" }));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("44");
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});

