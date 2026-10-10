import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), admin: vi.fn(), fail: false,
  rows: [] as Record<string, unknown>[] }));
vi.mock("@/lib/supabase/server", () => ({ supabaseServerConfigured: () => true,
  getUserFromToken: mocks.auth, getSupabaseAdmin: mocks.admin, resolveAssetForClient: async (ref: string) => ref }));
import { GET as browse } from "@/app/api/prompts/route";
import { GET as detail } from "@/app/api/prompts/[id]/route";

function query(table: string) {
  let rows = table === "maro_prompts" ? [...mocks.rows] : [];
  let fields: string[] = [];
  const orders: { column: string; ascending: boolean }[] = [];
  let start = 0, end = Infinity;
  const result = () => {
    rows.sort((a, b) => {
      for (const order of orders) {
        const compare = String(a[order.column]).localeCompare(String(b[order.column]));
        if (compare) return order.ascending ? compare : -compare;
      }
      return 0;
    });
    return { data: rows.slice(start, end).map(row => Object.fromEntries(fields.map(field => [field, row[field]]))), error: mocks.fail ? { message: "unavailable" } : null };
  };
  const builder = {
    select(value: string) { fields = value.split(",").map(field => field.trim()); return builder; },
    eq(column: string, value: unknown) { rows = rows.filter(row => row[column] === value); return builder; },
    in(column: string, values: unknown[]) { rows = rows.filter(row => values.includes(row[column])); return builder; },
    ilike(column: string, value: string) { rows = rows.filter(row => String(row[column]).toLowerCase().includes(value.slice(1, -1).toLowerCase())); return builder; },
    order(column: string, options?: { ascending?: boolean }) { orders.push({ column, ascending: options?.ascending !== false }); return builder; },
    limit(value: number) { end = value; return builder; },
    range(from: number, to: number) { start = from; end = to + 1; return builder; },
    async maybeSingle() { const response = result(); return { ...response, data: response.data[0] ?? null }; },
    then(resolve: (value: ReturnType<typeof result>) => unknown) { return Promise.resolve(result()).then(resolve); },
  };
  return builder;
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.fail = false; mocks.auth.mockResolvedValue(null);
  mocks.admin.mockReturnValue({ from: query });
  mocks.rows = Array.from({ length: 9 }, (_, index) => ({ id: String(index), title: `Preset ${index}`, tool: index % 2 ? "logo" : "imazh",
    target_tool: index % 2 ? "logo" : "reklama", active: true, status: "published", featured: index === 0,
    sort_order: index, created_at: `2026-10-${String(index + 1).padStart(2, "0")}`, category: index === 0 ? "Old category" : "Latest",
    search_text: `search ${index}`, config: { version: 1 }, full_prompt: "HIDDEN" }));
});
const request = (params = "") => new Request(`https://maro.test/api/prompts?${params}`);
describe("guest preset catalog", () => {
  it("exposes only three newest published presets across tools, ignoring old featured placement", async () => {
    mocks.rows.push({ ...mocks.rows[8], id: "draft", status: "draft", created_at: "2027-01-01" });
    mocks.rows.push({ ...mocks.rows[8], id: "future-web", tool: "web", created_at: "2027-01-02" });
    const imazh = await (await browse(request("tool=imazh&limit=60"))).json();
    const logo = await (await browse(request("tool=logo&limit=60"))).json();
    expect(imazh.items.map((item: { id: string }) => item.id)).toEqual(["8", "6"]);
    expect(logo.items.map((item: { id: string }) => item.id)).toEqual(["7"]);
    expect(imazh.hasMore).toBe(false);
    expect(JSON.stringify(imazh)).not.toContain("HIDDEN");
  });
  it.each(["page=1", "category=Old%20category", "q=search%200"])("cannot bypass the latest-three limit with %s", async params => {
    expect((await (await browse(request(params))).json()).items).toEqual([]);
  });
  it("blocks an older detail requested directly without a session", async () => {
    expect((await detail(request(), { params: Promise.resolve({ id: "0" }) })).status).toBe(401);
    expect((await detail(request(), { params: Promise.resolve({ id: "5" }) })).status).toBe(401);
  });
  it("allows preview details for one of the latest three without leaking hidden prompts", async () => {
    const response = await detail(request(), { params: Promise.resolve({ id: "8" }) });
    expect(response.status).toBe(200);
    expect(JSON.stringify(await response.json())).not.toContain("HIDDEN");
  });
  it("keeps the full catalog and older details available to signed-in users", async () => {
    mocks.auth.mockResolvedValue({ id: "owner" });
    const response = await browse(request("tool=imazh&limit=2"));
    expect((await response.json()).hasMore).toBe(true);
    expect((await detail(request(), { params: Promise.resolve({ id: "0" }) })).status).toBe(200);
  });
  it("fails closed if the guest allowlist cannot be loaded", async () => {
    mocks.fail = true;
    expect((await (await browse(request())).json()).items).toEqual([]);
    expect((await detail(request(), { params: Promise.resolve({ id: "0" }) })).status).toBe(503);
  });
});
