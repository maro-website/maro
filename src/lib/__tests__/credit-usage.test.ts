import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ db: vi.fn(), user: vi.fn(), configured: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdmin: m.db, getUserFromToken: m.user, supabaseServerConfigured: m.configured }));
import { fetchCreditUsage } from "@/lib/credits/usageServer";
import { jobUsageTool, type UsageJob } from "@/lib/credits/usage";
import { GET } from "@/app/api/credits/usage/route";

type Row = Record<string, unknown>;
let tables: Record<string, Row[]>;
let failTable: string | null;
const calls: Array<{ table: string; filters: Array<[string, string, unknown]>; select: string; page?: number[] }> = [];
const feedId = "11111111-1111-4111-8111-111111111111";
const appId = "22222222-2222-4222-8222-222222222222";
const stamp = "2026-10-01T00:00:00Z";
function tx(id: string, type: string, amount: number, job_id: string | null, extra: Row = {}): Row {
  return { id, user_id: "owner", created_at: stamp, type, amount, job_id, module: null, idempotency_key: null, ...extra };
}
function job(id: string, module: string, extra: Row = {}): Row & UsageJob {
  return { id, user_id: "owner", module, feed_order: null, feed_id: null, preset_id: null, ...extra };
}

beforeEach(() => {
  vi.clearAllMocks(); calls.length = 0; failTable = null;
  tables = { credit_transactions: [], generation_jobs: [], maro_feeds: [] };
  m.user.mockResolvedValue({ id: "owner" }); m.configured.mockReturnValue(true);
  m.db.mockReturnValue({ from: (table: string) => {
    const call = { table, filters: [] as Array<[string, string, unknown]>, select: "", page: undefined as number[] | undefined };
    calls.push(call);
    const q = {
      select: (s: string) => { call.select = s; return q; },
      eq: (key: string, value: unknown) => { call.filters.push(["eq", key, value]); return q; },
      in: (key: string, value: unknown[]) => { call.filters.push(["in", key, value]); return q; },
      lte: (key: string, value: string) => { call.filters.push(["lte", key, value]); return q; },
      order: () => q,
      range: (from: number, to: number) => { call.page = [from, to]; return q; },
      then: (resolve: (v: unknown) => void) => {
        let rows = tables[table].filter(row => call.filters.every(([op, key, value]) =>
          op === "eq" ? row[key] === value : op === "in" ? (value as unknown[]).includes(row[key]) : String(row[key]) <= String(value)));
        if (call.page) rows = rows.slice(call.page[0], call.page[1] + 1);
        return Promise.resolve({ data: rows, error: table === failTable ? { message: "private database detail" } : null }).then(resolve);
      },
    };
    return q;
  } });
});

describe("account credit usage", () => {
  it("recovers historical tool attribution from jobs with empty transaction metadata and merges aliases", async () => {
    tables.generation_jobs = [job("image", "reklama"), job("image2", "maro_imazh"), job("logo", "logo"), job("edit", "edit-html"), job("web", "web")];
    tables.credit_transactions = [tx("a", "charge", 7, "image"), tx("b", "charge", 5, "image2"), tx("c", "charge", 10, "logo"), tx("d", "charge", 15, "edit"), tx("e", "charge", 20, "web"), tx("r", "reserve", 500, "image"), tx("l", "release", 500, "image")];
    expect(await fetchCreditUsage("owner")).toEqual({ items: [
      { module: "web", label: "maroWeb", charged: 35, refunded: 0, credits: 35 },
      { module: "imazh", label: "maroImazh", charged: 12, refunded: 0, credits: 12 },
      { module: "logo", label: "maroLogo", charged: 10, refunded: 0, credits: 10 },
    ], unattributedRefunds: 0 });
  });

  it("separates presets, Feed orders/regenerations, Apps and Marketing; refunds each owned studio exactly once", async () => {
    tables.maro_feeds = [
      { id: feedId, owner_id: "owner", created_at: stamp, order_job_id: "feed-order", app_format: null, marketing_id: null },
      { id: appId, owner_id: "owner", created_at: stamp, order_job_id: "app-order", app_format: "4:5", marketing_id: null },
      { id: "marketing", owner_id: "owner", created_at: stamp, order_job_id: "marketing-order", app_format: null, marketing_id: "campaign" },
    ];
    tables.generation_jobs = [job("feed-order", "reklama", { feed_order: true }), job("regen", "reklama", { feed_id: feedId }), job("app-order", "reklama", { feed_order: true }), job("marketing-order", "reklama", { feed_order: true }), job("preset", "logo", { preset_id: "private-preset" }), job("legacy-preset", "prompte")];
    tables.credit_transactions = [tx("a", "charge", 50, "feed-order"), tx("b", "charge", 5, "regen"), tx("c", "charge", 50, "app-order"), tx("d", "charge", 50, "marketing-order"), tx("e", "charge", 5, "preset"), tx("f", "refund", 30, null, { idempotency_key: `feed-cancel-${feedId}` }), tx("g", "refund", 50, null, { idempotency_key: `feed-refund-${appId}` }), tx("h", "charge", 2, "legacy-preset")];
    const result = await fetchCreditUsage("owner");
    expect(result.items).toEqual([
      { module: "marketing", label: "maroMarketing", charged: 50, refunded: 0, credits: 50 },
      { module: "feed", label: "maroFeed", charged: 55, refunded: 30, credits: 25 },
      { module: "presets", label: "maroPresets", charged: 7, refunded: 0, credits: 7 },
      { module: "apps", label: "maroApps", charged: 50, refunded: 50, credits: 0 },
    ]);
    expect(result.unattributedRefunds).toBe(0);
  });

  it("reads past 200 and 500 transactions, batches jobs and scopes every read to the authenticated account", async () => {
    tables.generation_jobs = Array.from({ length: 501 }, (_, i) => job(`job-${i}`, "logo"));
    tables.credit_transactions = tables.generation_jobs.map((row, i) => tx(String(i), "charge", 5, row.id as string));
    tables.credit_transactions.push(tx("foreign", "charge", 9999, "foreign", { user_id: "someone-else" }));
    tables.generation_jobs.push(job("foreign", "reklama", { user_id: "someone-else" }));
    const result = await fetchCreditUsage("owner");
    expect(result.items).toEqual([{ module: "logo", label: "maroLogo", charged: 2505, refunded: 0, credits: 2505 }]);
    expect(calls.filter(c => c.table === "credit_transactions").map(c => c.page)).toEqual([[0, 499], [500, 999]]);
    for (const c of calls) {
      expect(c.filters).toContainEqual(["eq", c.table === "maro_feeds" ? "owner_id" : "user_id", "owner"]);
      expect(c.select).not.toContain("*");
      if (c.table === "generation_jobs") expect((c.filters.find(f => f[0] === "in")![2] as string[]).length).toBeLessThanOrEqual(100);
    }
  });

  it("does not use another owner's matching job/feed or invent a tool for unmatched refunds", async () => {
    tables.generation_jobs = [job("foreign", "logo", { user_id: "someone-else" })];
    tables.maro_feeds = [{ id: feedId, owner_id: "someone-else", created_at: stamp, order_job_id: "foreign", app_format: "4:5" }];
    tables.credit_transactions = [tx("a", "charge", 4, "foreign"), tx("b", "refund", 3, null, { idempotency_key: `feed-cancel-${feedId}` }), tx("c", "charge", 8, null, { module: "maro_logo" }), tx("d", "refund", 2, null, { module: "logo" })];
    expect(await fetchCreditUsage("owner")).toEqual({ items: [
      { module: "logo", label: "maroLogo", charged: 8, refunded: 2, credits: 6 },
      { module: "unattributed", label: "Tool i paidentifikuar", charged: 4, refunded: 0, credits: 4 },
    ], unattributedRefunds: 3 });
  });

  it.each(["credit_transactions", "generation_jobs", "maro_feeds"])("fails the whole summary if %s fails, without publishing partial totals", async table => {
    tables.credit_transactions = [tx("a", "charge", 5, "job")];
    failTable = table;
    const response = await GET(new Request("https://maro.al/api/credits/usage"));
    expect(response.status).toBe(503); expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ error: "credit_usage_unavailable" });
  });

  it("rejects guests before any database read and ignores caller-supplied account/workspace/limit", async () => {
    m.user.mockResolvedValueOnce(null);
    const guest = await GET(new Request("https://maro.al/api/credits/usage"));
    expect(guest.status).toBe(401); expect(m.db).not.toHaveBeenCalled();
    const owner = await GET(new Request("https://maro.al/api/credits/usage?userId=someone-else&workspaceId=foreign&limit=1", { headers: { authorization: "Bearer synthetic" } }));
    expect(owner.status).toBe(200); expect(m.user).toHaveBeenLastCalledWith("synthetic");
    expect(owner.headers.get("cache-control")).toBe("private, no-store");
    expect(await owner.json()).toEqual({ items: [], unattributedRefunds: 0 });
    expect(calls.every(c => c.filters.some(f => f[2] === "owner"))).toBe(true);
  });

  it("uses known public labels, including historical and future module aliases", () => {
    for (const [module, label] of [["maro_imazh", "maroImazh"], ["maro_logo", "maroLogo"], ["edit-html", "maroWeb"], ["zo", "maroAudio"], ["filma", "maroFilma"], ["chat", "maroChat"]])
      expect(jobUsageTool(job("j", module)).label).toBe(label);
    expect(jobUsageTool(job("j", "<private-unknown>")).label).toBe("Tool i paidentifikuar");
  });
});
