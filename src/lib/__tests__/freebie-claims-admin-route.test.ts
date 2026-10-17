import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), rate: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/admin/auth", () => ({ requirePermission: mocks.auth }));
vi.mock("@/lib/security/rateLimit", () => ({ checkRateLimit: mocks.rate }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdmin: () => ({ from: mocks.from }) }));
import { GET } from "@/app/api/admin/freebies/[dropId]/claims/route";

const actor = "11111111-1111-4111-8111-111111111111";
const dropId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
const drop = { id: dropId, code: "TEST-DROP", title: "Promotion", claims_count: 2, credits_given: 25 };
const profile = { id: userId, email: "demo@example.test", username: "demo", full_name: "Demo User" };
const claim = { id: "44444444-4444-4444-8444-444444444444", user_id: userId, credits: 10, claimed_at: "2026-10-15T10:00:00Z", balance_after: 1234 };
function query() {
  return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), maybeSingle: vi.fn(), range: vi.fn(), in: vi.fn() };
}
let drops: ReturnType<typeof query>, claims: ReturnType<typeof query>, profiles: ReturnType<typeof query>, attempts: ReturnType<typeof query>;
const request = (suffix = "") => new Request(`https://maro.al/api/admin/freebies/${dropId}/claims${suffix}`);
const context = (id = dropId) => ({ params: Promise.resolve({ dropId: id }) });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ ok: true, admin: { userId: actor } });
  mocks.rate.mockResolvedValue({ allowed: true, retryAfter: 0 });
  drops = query(); claims = query(); profiles = query(); attempts = query();
  drops.maybeSingle.mockResolvedValue({ data: drop, error: null });
  claims.range.mockResolvedValue({ data: [claim], error: null, count: 1 });
  profiles.in.mockResolvedValue({ data: [profile], error: null });
  attempts.range.mockResolvedValue({ data: [], error: null, count: 0 });
  mocks.from.mockImplementation((name: string) => ({ freebie_drops: drops, freebie_claims: claims, profiles, freebie_exhausted_attempts: attempts })[name as "profiles"]);
});

describe("admin Freebie claim directory", () => {
  it.each(["forbidden", "insufficient_permission", "mfa_enrollment_required", "mfa_challenge_required"])("blocks %s before any claim data query", async error => {
    mocks.auth.mockResolvedValue({ ok: false, status: 403, error });
    const res = await GET(request("?view=missed"), context());
    expect(res.status).toBe(403); expect(await res.json()).toEqual({ error });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.from).not.toHaveBeenCalled(); expect(mocks.rate).not.toHaveBeenCalled();
    expect(mocks.auth).toHaveBeenCalledWith(expect.any(Request), "credits.adjust");
  });

  it("returns only this drop's paginated claims, actual reward amounts and profile identity", async () => {
    claims.range.mockResolvedValue({ data: [claim], error: null, count: 61 });
    const res = await GET(request("?offset=50"), context());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ drop, total: 61, offset: 50, limit: 50, claims: [{ id: claim.id, credits: 10, claimed_at: claim.claimed_at, user: profile }] });
    expect(drops.eq).toHaveBeenCalledWith("id", dropId); expect(drops.is).toHaveBeenCalledWith("deleted_at", null);
    expect(claims.eq).toHaveBeenCalledWith("drop_id", dropId);
    expect(claims.select).toHaveBeenCalledWith("id,user_id,credits,claimed_at", { count: "exact" });
    expect(claims.order.mock.calls).toEqual([["claimed_at", { ascending: false }], ["id", { ascending: false }]]);
    expect(claims.range).toHaveBeenCalledWith(50, 99);
    expect(profiles.select).toHaveBeenCalledWith("id,email,username,full_name");
    expect(profiles.in).toHaveBeenCalledWith("id", [userId]);
    expect(mocks.rate).toHaveBeenCalledWith("freebies:admin:claims", actor, 120, 60, "strict");
    expect(res.headers.get("Vary")).toBe("Authorization");
  });

  it("returns only the selected drop's late accounts and page identities, with no balances", async () => {
    const attempt = { id: claim.id, user_id: userId, attempts: 4, first_attempt_at: claim.claimed_at, last_attempt_at: "2026-10-17T10:00:00Z", private_extra: "never returned" };
    drops.maybeSingle.mockResolvedValue({ data: { ...drop, missed_users: 61, missed_attempts: 80 }, error: null });
    attempts.range.mockResolvedValue({ data: [attempt, { ...attempt, id: "deleted", user_id: null, attempts: 1 }], count: 61, error: null });
    const res = await GET(request("?view=missed&offset=50"), context()); const data = await res.json();
    expect(res.status).toBe(200); expect(data).toMatchObject({ total: 61, offset: 50, limit: 50, claims: [], drop: { missed_users: 61, missed_attempts: 80 } });
    expect(data.attempts).toEqual([{ id: attempt.id, attempts: 4, first_attempt_at: attempt.first_attempt_at, last_attempt_at: attempt.last_attempt_at, user: profile }, { id: "deleted", attempts: 1, first_attempt_at: attempt.first_attempt_at, last_attempt_at: attempt.last_attempt_at, user: null }]);
    expect(attempts.eq).toHaveBeenCalledWith("drop_id", dropId);
    expect(attempts.select).toHaveBeenCalledWith("id,user_id,attempts,first_attempt_at,last_attempt_at", { count: "exact" });
    expect(attempts.order.mock.calls).toEqual([["last_attempt_at", { ascending: false }], ["id", { ascending: false }]]);
    expect(attempts.range).toHaveBeenCalledWith(50,99); expect(profiles.in).toHaveBeenCalledWith("id", [userId]);
    expect(claims.range).not.toHaveBeenCalled(); expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("handles empty interest and fails closed on interest/profile database errors", async () => {
    const empty = await (await GET(request("?view=missed"),context())).json();
    expect(empty).toMatchObject({ total: 0, attempts: [] }); expect(profiles.in).not.toHaveBeenCalled();
    attempts.range.mockResolvedValueOnce({ error: { message: "private" }, data: [], count: 0 });
    expect((await GET(request("?view=missed"),context())).status).toBe(503);
    attempts.range.mockResolvedValue({ error: null, data: [{ id: claim.id, user_id: userId, attempts: 1 }], count: 1 });
    profiles.in.mockResolvedValueOnce({ error: { message: "private" }, data: [] });
    expect((await GET(request("?view=missed"),context())).status).toBe(503);
  });

  it("retains deleted users' claims without recovering their old identities", async () => {
    claims.range.mockResolvedValue({ data: [{ ...claim, user_id: null }], error: null, count: 1 });
    const res = await GET(request(), context()); const data = await res.json();
    expect(data.claims).toEqual([{ id: claim.id, credits: 10, claimed_at: claim.claimed_at, user: null }]);
    expect(data.total).toBe(1); expect(mocks.from.mock.calls.flat()).not.toContain("profiles");
  });

  it("supports an empty code and an unavailable profile without dropping the claim", async () => {
    claims.range.mockResolvedValueOnce({ data: [], error: null, count: 0 });
    expect(await (await GET(request(), context())).json()).toMatchObject({ claims: [], total: 0 });
    expect(profiles.in).not.toHaveBeenCalled();
    profiles.in.mockResolvedValue({ data: [], error: null });
    expect((await (await GET(request(), context())).json()).claims[0].user).toBeNull();
  });

  it.each(["?offset=-1", "?offset=1.5", "?offset=Infinity", "?offset=no", "?offset=1000001", "?view=other"])("rejects invalid pagination/view %s", async suffix => {
    expect((await GET(request(suffix), context())).status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled(); expect(mocks.rate).not.toHaveBeenCalled();
  });

  it("rejects malformed drop IDs and hides missing or deleted drops", async () => {
    expect((await GET(request(), context("not-a-uuid"))).status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
    drops.maybeSingle.mockResolvedValue({ data: null, error: null });
    const res = await GET(request(), context());
    expect(res.status).toBe(404); expect(await res.json()).toEqual({ error: "drop_not_found" });
    expect(claims.range).not.toHaveBeenCalled();
  });

  it("does not return partial data after a database failure", async () => {
    drops.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "private DB error" } });
    const dropError = await GET(request(), context());
    expect(dropError.status).toBe(503); expect(await dropError.json()).toEqual({ error: "claims_unavailable" });
    claims.range.mockResolvedValueOnce({ data: [claim], error: { message: "private DB error" }, count: 1 });
    expect((await GET(request(), context())).status).toBe(503);
    profiles.in.mockResolvedValueOnce({ data: [profile], error: { message: "private DB error" } });
    expect((await GET(request(), context())).status).toBe(503);
  });

  it("rate limits the directory before querying any claims", async () => {
    mocks.rate.mockResolvedValue({ allowed: false, retryAfter: 45 });
    const res = await GET(request(), context());
    expect(res.status).toBe(429); expect(res.headers.get("Retry-After")).toBe("45");
    expect(res.headers.get("Cache-Control")).toBe("no-store"); expect(mocks.from).not.toHaveBeenCalled();
  });
});
