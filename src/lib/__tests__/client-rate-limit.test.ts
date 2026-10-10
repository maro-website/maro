import { afterEach, describe, expect, it, vi } from "vitest";
import { clearClientRateLimit, formatRetryTime, rateLimitedFetch, rateLimitSnapshot, retryAfterSeconds } from "@/lib/client/rateLimit";
afterEach(() => { clearClientRateLimit(); vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("client rate-limit countdown", () => {
  it("reads seconds, HTTP dates and server JSON, rejecting invalid periods", () => {
    expect(retryAfterSeconds("91", {})).toBe(91); expect(retryAfterSeconds(null, { retry_after: 3601 })).toBe(3601);
    expect(retryAfterSeconds("Thu, 01 Jan 1970 00:01:30 GMT", {}, 0)).toBe(90);
    expect(retryAfterSeconds("garbage", {})).toBeNull(); expect(retryAfterSeconds(null, { retry_after: -1 })).toBeNull();
    expect(formatRetryTime(125)).toBe("02:05"); expect(formatRetryTime(3601)).toBe("1:00:01");
  });
  it("keeps the caller response readable and exposes the actual retry deadline", async () => {
    vi.stubGlobal("window", {}); vi.useFakeTimers(); vi.setSystemTime(100000);
    vi.stubGlobal("fetch", async () => Response.json({ error: "rate_limited", retry_after: 125 }, { status: 429, headers: { "Retry-After": "125" } }));
    const response = await rateLimitedFetch("/api/auth/signup"); expect(await response.json()).toEqual({ error: "rate_limited", retry_after: 125 });
    expect(rateLimitSnapshot()).toEqual({ expiresAt: 225000, known: true, scope: "Regjistrimi" });
  });
  it("labels unknown provider waiting periods honestly and leaves successful requests alone", async () => {
    vi.stubGlobal("window", {}); vi.stubGlobal("fetch", async () => Response.json({ error: "rate_limited" }, { status: 429 }));
    await rateLimitedFetch("/api/ai/image"); expect(rateLimitSnapshot()?.known).toBe(false);
    clearClientRateLimit(); vi.stubGlobal("fetch", async () => Response.json({ ok: true })); await rateLimitedFetch("/api/ai/image"); expect(rateLimitSnapshot()).toBeNull();
  });
});
