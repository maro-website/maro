import { describe, it, expect, vi } from "vitest";
import sharp from "sharp";
import { createHash, randomUUID } from "node:crypto";
const m = vi.hoisted(() => ({ db: vi.fn(), resolve: vi.fn(), provider: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ supabaseServerConfigured: () => true, getUserFromToken: async () => ({ id: "11111111-1111-4111-8111-111111111111", email: "erzen@nice.al", email_confirmed_at: "2026-10-31" }), getSupabaseAdmin: m.db, getWorkspaceBrainProfile: vi.fn(), resolveAssetListForClient: async (refs: string[]) => refs.map(r => `https://synthetic.test/${r}`) }));
vi.mock("@/lib/ai/openai", () => ({ hasOpenAiKey: () => true, editImages: m.provider }));
vi.mock("@/lib/ai/imageReferences", () => ({ resolvePrivateImageReference: m.resolve }));
vi.mock("@/lib/engine/v1ImageModels", () => ({ loadV1ImageModelRows: async () => [], resolveV1ImageModel: () => ({ providerModelId: "gpt-image-2.5-flare" }) }));
vi.mock("@/lib/security/circuitBreaker", () => ({ assertCircuitAllows: async () => ({ ok: true }) }));
vi.mock("@/lib/operations/budgetGuards", () => ({ assertBudgetGuards: async () => ({ ok: true }) }));
vi.mock("@/lib/workspaces/accountPolicyServer", () => ({ AccountPolicyError: class extends Error {}, requireBrainAccess: vi.fn(), requireStorageSpace: vi.fn() }));
vi.mock("@/lib/security/rateLimit", () => ({ checkRateLimit: async () => ({ allowed: true }) }));
vi.mock("@/lib/generation/orchestrator", () => ({ recordCompletedGenerationCosts: vi.fn() }));
import { handleFeedAction } from "@/lib/feed/server";
import { defaultConfig } from "@/lib/feed/model";
import { planFeedProducts, type FeedDesign } from "@/lib/feed/campaign";

describe("Feed real render orchestration with synthetic provider and storage", () => {
  it.each([false, true])("uses the assigned original product, never a generated anchor; preserves exact logo and format on initial/regen=%s", async regenerate => {
    vi.clearAllMocks();
    const owner = "11111111-1111-4111-8111-111111111111", id = randomUUID(), job = randomUUID(), attempt = randomUUID();
    const refs = Array.from({ length: 4 }, (_, i) => `storage:generations/${owner}/refs/${i}.png`);
    const assets = refs.map((_, index) => ({ index, role: index === 3 ? "logo" as const : "product" as const, label: ["Spray", "Floor", "Wipes", "Logo"][index] }));
    const design: FeedDesign = { version: 1, font: "inter", typeScale: "small", format: "4:5", logoPosition: "top-right", assets, assignments: planFeedProducts(assets), palette: ["#225599"] };
    const sources = await Promise.all(["#ff0000", "#00ff00", "#0000ff", "#ff00ff"].map(background => sharp({ create: { width: 40, height: 20, channels: 4, background } }).png().toBuffer()));
    m.resolve.mockImplementation(async (ref: string) => { const index = refs.indexOf(ref); if (index < 0) throw new Error("generated_anchor_forbidden"); return { dataUrl: `data:image/png;base64,${sources[index].toString("base64")}`, digest: createHash("sha256").update(sources[index]).digest("hex") }; });
    const source = await sharp({ create: { width: 1024, height: 1536, channels: 4, background: "#ffffff" } }).png().toBuffer();
    m.provider.mockResolvedValue([source.toString("base64")]);
    const feed = { id, owner_id: owner, workspace_id: "ws", reference: refs[0], references_list: refs, content_type: "mix", text_mode: true, cancel_requested: false, cancelled_at: null, refund_credits: 0, category: "home", config: defaultConfig, brain_context: "", free_used: 0, refunded: false, created_at: new Date().toISOString(), brief: { brand: "Mr. Clean", description: "Three separate cleaning products", audience: "", goal: "sales", language: "sq", colors: "", notes: "", design } };
    const rows = Array.from({ length: regenerate ? 9 : 1 }, (_, slot) => ({ id: randomUUID(), slot, job_id: `old-${slot}`, status: "completed", created_at: "2026-10-30", regenerate: false }));
    const traces: Record<string, unknown>[] = []; let output: Buffer | undefined;
    const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
      if (name === "maro_feed_claim") return { data: { claimed: true, attempt: { id: attempt, job_id: job, regenerate, free_regen: true } }, error: null };
      if (name === "maro_feed_finish") { rows.unshift({ id: attempt, slot: 1, job_id: job, status: "completed", created_at: "2026-10-31", regenerate }); return { data: randomUUID(), error: null }; }
      if (name === "maro_feed_recover") return { data: null, error: null };
      throw new Error(`${name}:${JSON.stringify(args)}`);
    });
    m.db.mockReturnValue({ rpc, from: (table: string) => {
      const q = { select: () => q, eq: () => q, order: () => q, limit: () => q,
        single: async () => ({ data: feed, error: null }), maybeSingle: async () => ({ data: table === "maro_feed_config" ? { config: defaultConfig } : feed, error: null }),
        insert: async (value: Record<string, unknown>) => { traces.push(value); return { error: null }; },
        then: (done: (value: unknown) => void) => Promise.resolve({ data: table === "maro_feed_attempts" ? rows : [], error: null }).then(done),
      }; return q;
    }, storage: { from: () => ({ upload: async (_path: string, bytes: Buffer) => { output = bytes; return { error: null }; }, download: async () => ({ data: new Blob([new Uint8Array(output!)]), error: null }) }) } });
    const response = await handleFeedAction(new Request("https://maro.al/api/feed/action", { method: "POST", headers: { authorization: "Bearer synthetic", "content-type": "application/json" }, body: JSON.stringify({ feedId: id, requestId: randomUUID(), action: regenerate ? "regenerate" : "next", ...(regenerate ? { slot: 1 } : {}) }) }));
    expect(response.status).toBe(200); const events = await response.text(); expect(events).not.toContain('"error"');
    expect(m.provider).toHaveBeenCalledTimes(1);
    const call = m.provider.mock.calls[0][0]; expect(call.size).toBe("1024x1536"); expect(call.images).toHaveLength(2);
    expect(call.images[0]).toBe(`data:image/png;base64,${sources[1].toString("base64")}`); expect(call.prompt).toContain("THIS POST MUST SHOW: Floor"); expect(call.prompt).not.toContain("first completed");
    expect(m.resolve.mock.calls.map(([ref]) => ref).sort()).toEqual([refs[1], refs[3]].sort());
    expect(traces[0]).toMatchObject({ snapshot: { resolvedReferenceIndices: [1, 3], assignedProductIndices: [1], providerReferenceIndices: [1], fontSpecimenIncluded: true, logoComposited: true } });
    const info = await sharp(output!).metadata(); expect([info.width, info.height]).toEqual([1024, 1280]);
    expect(rpc.mock.calls.filter(([name]) => name === "maro_feed_finish")).toHaveLength(1);
  });
});
