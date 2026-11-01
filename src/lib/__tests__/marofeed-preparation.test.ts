import { describe, it, expect, vi, afterEach } from "vitest";
import { feedPreparationKey, feedPreparationStatus, type FeedPreparationAttempt } from "@/lib/feed/preparation";
const m = vi.hoisted(() => ({ token: vi.fn(async () => "synthetic") }));
vi.mock("@/lib/supabase/client", () => ({ getAccessToken: m.token }));
import { checkFeedRequest, feedJson } from "@/lib/feed/client";

const requestId = "cacce6b6-5302-46d1-b891-13f2d38b5a26", now = Date.now();
const attempt = (status = "running", age = 180_000): FeedPreparationAttempt => ({ id: "571e0169-27fc-4a15-82ff-b29a58dfa493", request_key: `feed-plan:${requestId}`, status, created_at: new Date(now - age).toISOString() });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); m.token.mockResolvedValue("synthetic"); });

describe("interrupted Feed preparation", () => {
  it("distinguishes a fresh provider call, stale work and a completed private plan", () => {
    expect(feedPreparationStatus(attempt("running", 30_000), now).state).toBe("running");
    expect(feedPreparationStatus(attempt(), now).state).toBe("interrupted");
    expect(feedPreparationStatus(attempt("uncertain"), now).state).toBe("interrupted");
    expect(feedPreparationStatus(attempt("completed"), now).state).toBe("prepared");
    expect(feedPreparationStatus(null, now).state).toBe("missing");
  });
  it("preserves the customer charge key and reuses an in-flight/completed retry's cost reservation", () => {
    const original = attempt(); const retryKey = feedPreparationKey(requestId, original);
    expect(retryKey).toBe(`feed-plan:${requestId}:retry:${original.id}`); expect(retryKey.length).toBeLessThan(128);
    expect(feedPreparationKey(requestId, { ...attempt("running", 100), request_key: retryKey })).toBe(retryKey);
    expect(feedPreparationKey(requestId, { ...attempt("completed"), request_key: retryKey })).toBe(retryKey);
  });
  it("ends a hung authentication lookup without leaving the UI locked", async () => {
    vi.useFakeTimers(); m.token.mockReturnValueOnce(new Promise(() => {}));
    const check = checkFeedRequest("/api/feed?requestId=synthetic", new AbortController().signal, 20);
    const rejected = expect(check).rejects.toThrow("feed_check_timeout");
    await vi.advanceTimersByTimeAsync(20); await rejected;
  });
  it("ends a stalled response body and aborts its fetch", async () => {
    vi.useFakeTimers(); let signal: AbortSignal | undefined;
    vi.stubGlobal("fetch", vi.fn(async (_path, options) => { signal = options.signal; return { ok: true, json: () => new Promise(() => {}) }; }));
    const check = checkFeedRequest("/api/feed?requestId=synthetic", new AbortController().signal, 20);
    const rejected = expect(check).rejects.toThrow("feed_check_timeout");
    await vi.advanceTimersByTimeAsync(20); await rejected; expect(signal?.aborted).toBe(true);
  });
  it("maps a proxy's non-JSON 502 to a useful Feed error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("Bad Gateway", { status: 502 })));
    await expect(feedJson("/api/feed")).rejects.toThrow("feed_unavailable");
  });
});
