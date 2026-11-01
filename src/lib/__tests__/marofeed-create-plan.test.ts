import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import sharp from "sharp";
import { legacyFeedDesign } from "@/lib/feed/campaign";
import { feedPlanFixture } from "./helpers/feedPlanFixture";
import { ImageRequestValidationError } from "@/lib/generation/requestValidation";
const m = vi.hoisted(() => ({ db: vi.fn(), plan: vi.fn(), image: "" }));
vi.mock("@/lib/supabase/server", () => ({ supabaseServerConfigured: () => true, getUserFromToken: async () => ({ id: "11111111-1111-4111-8111-111111111111", email: "erzen@nice.al", email_confirmed_at: "2026-10-31" }), getSupabaseAdmin: m.db, getWorkspaceBrainProfile: vi.fn(), resolveAssetListForClient: async () => [] }));
vi.mock("@/lib/ai/openai", () => ({ hasOpenAiKey: () => true, editImages: vi.fn() }));
vi.mock("@/lib/ai/imageReferences", () => ({ resolvePrivateImageReference: async () => ({ dataUrl: m.image, digest: "a".repeat(64) }) }));
vi.mock("@/lib/engine/v1ImageModels", () => ({ loadV1ImageModelRows: async () => [], resolveV1ImageModel: () => ({ providerModelId: "gpt-image-2.5-flare" }) }));
vi.mock("@/lib/security/circuitBreaker", () => ({ assertCircuitAllows: async () => ({ ok: true }) }));
vi.mock("@/lib/operations/budgetGuards", () => ({ assertBudgetGuards: async () => ({ ok: true }) }));
vi.mock("@/lib/workspaces/accountPolicyServer", () => ({ AccountPolicyError: class extends Error {}, requireBrainAccess: vi.fn(), requireStorageSpace: vi.fn() }));
vi.mock("@/lib/security/rateLimit", () => ({ checkRateLimit: async () => ({ allowed: true }) }));
vi.mock("@/lib/prompt-optimizer/feed", () => ({ planFeedCampaign: m.plan }));
import { handleFeedCreate } from "@/lib/feed/server";
import { defaultConfig } from "@/lib/feed/model";

describe("Feed plan admission through the real create API and existing financial SQL", () => {
  it("does not charge a failed plan; stores only its owned durable reference, fits the SQL brief limit and charges replay once", async () => {
    const owner = "11111111-1111-4111-8111-111111111111", requestId = crypto.randomUUID(), design = legacyFeedDesign(1);
    const plan = feedPlanFixture(design);
    plan.look = plan.look.padEnd(650, " shared finish").slice(0, 650);
    plan.sources[0].kind = "collection";
    plan.sources[0].products = Array.from({ length: 8 }, (_, i) => ({ name: `Visible original variant ${i}`.padEnd(90, " exact").slice(0, 90), identity: "Exact original packaging, visible colors and label. ".repeat(5).slice(0, 240) }));
    plan.posts.forEach((post, i) => { post.concept = post.concept.padEnd(220, " distinct concept").slice(0, 220); post.scene = post.scene.padEnd(650, " coherent original details").slice(0, 650); post.subjects[0].product = plan.sources[0].products[i % 8].name; });
    expect(JSON.stringify(plan).length).toBeGreaterThan(12000);
    m.image = "data:image/png;base64," + (await sharp({ create: { width: 8, height: 8, channels: 4, background: "#225599" } }).png().toBuffer()).toString("base64");
    const db = new PGlite({ extensions: { pg_trgm } });
    try {
      await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create role supabase_admin;create role supabase_auth_admin;
        create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
        create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
        create function auth.role() returns text language sql as $$select current_setting('request.jwt.claim.role',true)$$;
        create function auth.jwt() returns jsonb language sql as $$select '{}'::jsonb$$;
        grant usage on schema public,auth to anon,authenticated,service_role;`);
      await db.exec(readFileSync("docs/db-history/v1-baseline-20261009.sql", "utf8"));
      await db.exec("create schema storage;create table storage.objects(bucket_id text,name text,metadata jsonb,primary key(bucket_id,name));create table storage.buckets(id text primary key,file_size_limit bigint,allowed_mime_types text[]);");
      for (const file of ["0057_v1_security_boundaries.sql", "0058_atomic_generation_accounting.sql", "0075_marofeed_private_pilot.sql", "0076_marofeed_choices_and_cancellation.sql"]) await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
      await db.exec("set request.jwt.claim.role='service_role'");
      await db.query("insert into auth.users values($1,'erzen@nice.al',now())", [owner]);
      await db.query("insert into profiles(id,email,credits) values($1,'erzen@nice.al',500)", [owner]);
      await db.query("insert into workspaces(id,owner_id,name) values('ws',$1,'Original Brand')", [owner]);
      await db.exec(`insert into app_settings(id,master_prompt,platform_limits) values(1,'Existing prompt','{"userHourlyUsd":1000,"userDailyUsd":1000}');`);
      await db.query("insert into storage.objects values('generations',$1,'{\"size\":100}')", [`${owner}/refs/product.png`]);
      const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
        try {
          if (name === "maro_feed_create_v2") return { data: (await db.query<{ id: string }>("select maro_feed_create_v2($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) id", [args.p_user, args.p_workspace, args.p_request, args.p_references, args.p_category, args.p_brief, args.p_context, args.p_config, args.p_content_type, args.p_text_mode])).rows[0].id, error: null };
          if (name === "maro_feed_recover") { await db.query("select maro_feed_recover($1,$2)", [args.p_user, args.p_feed]); return { data: null, error: null }; }
          throw new Error("unexpected_rpc");
        } catch (error) { return { data: null, error: { message: (error as Error).message } }; }
      });
      m.db.mockReturnValue({ rpc, from: (table: string) => {
        let id = "", key = "", lookup = false;
        const row = async () => table === "workspaces" ? { id: "ws" } : table === "maro_feed_config" ? { config: defaultConfig, revision: 0 } : table === "maro_optimizer_attempts" ? lookup ? { id: "571e0169-27fc-4a15-82ff-b29a58dfa493", request_key: `feed-plan:${requestId}`, status: "running", created_at: new Date(Date.now() - 180_000).toISOString() } : { final_prompt: JSON.stringify({ look: plan.look, sources: plan.sources, posts: plan.posts }) } : table === "maro_feeds" ? (await db.query(`select * from maro_feeds where ${key ? "request_id" : "id"}=$1 and owner_id=$2`, [key || id, owner])).rows[0] : null;
        const q = { select: () => q, eq: (column: string, value: string) => { if (column === "id") id = value; if (column === "request_id") key = value; return q; }, like: () => { lookup = true; return q; }, order: () => q, limit: () => q, maybeSingle: async () => ({ data: await row(), error: null }), single: async () => ({ data: await row(), error: null }), then: (done: (value: unknown) => void) => Promise.resolve({ data: [], error: null }).then(done) };
        return q;
      } });
      const body = { requestId, workspaceId: "ws", references: [`storage:generations/${owner}/refs/product.png`], design, category: "drinks", useBrain: false, brief: { brand: "Original Brand", description: "A real original product collection", notes: "Chrismas Themed", language: "sq" } };
      const request = () => new Request("https://maro.al/api/feed", { method: "POST", headers: { authorization: "Bearer synthetic", "content-type": "application/json" }, body: JSON.stringify(body) });
      m.plan.mockRejectedValueOnce(new ImageRequestValidationError("optimizer_unavailable", 503));
      expect((await handleFeedCreate(request())).status).toBe(503); expect(rpc).not.toHaveBeenCalled();
      expect((await db.query<{ credits: number }>("select credits from profiles where id=$1", [owner])).rows[0].credits).toBe(500);
      m.plan.mockResolvedValue(plan);
      const response = await handleFeedCreate(request()); expect(await response.clone().json()).not.toHaveProperty("error"); expect(response.status).toBe(200);
      const beforeReplay = m.plan.mock.calls.length;
      expect(m.plan.mock.calls.at(-1)?.[0].requestKey).toBe(`feed-plan:${requestId}:retry:571e0169-27fc-4a15-82ff-b29a58dfa493`);
      expect((await handleFeedCreate(request())).status).toBe(200);
      expect(m.plan).toHaveBeenCalledTimes(beforeReplay);
      const rows = (await db.query<{ brief: { campaignPlan: object }; bytes: number }>("select brief,pg_column_size(brief) bytes from maro_feeds")).rows;
      expect(rows).toHaveLength(1); expect(rows[0].bytes).toBeLessThan(12000);
      expect(rows[0].brief.campaignPlan).toEqual({ version: plan.version, optimizer: plan.optimizer });
      expect(rows[0].brief.campaignPlan).not.toHaveProperty("posts");
      expect((await db.query<{ credits: number }>("select credits from profiles where id=$1", [owner])).rows[0].credits).toBe(450);
    } finally { await db.close(); }
  });
});
