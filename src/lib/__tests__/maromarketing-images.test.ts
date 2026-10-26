import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
const m = vi.hoisted(() => ({ db: vi.fn(), brain: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ supabaseServerConfigured: () => true, getUserFromToken: async () => ({ id: "11111111-1111-4111-8111-111111111111", email: "erzen@nice.al", email_confirmed_at: "2026-10-26" }), getSupabaseAdmin: m.db, getWorkspaceBrainProfile: m.brain, resolveAssetListForClient: async () => [] }));
vi.mock("@/lib/ai/openai", () => ({ hasOpenAiKey: () => true, editImages: vi.fn() }));
vi.mock("@/lib/ai/imageReferences", () => ({ resolvePrivateImageReference: async () => ({ dataUrl: "data:image/png;base64,synthetic", digest: "synthetic" }) }));
vi.mock("@/lib/engine/v1ImageModels", () => ({ loadV1ImageModelRows: async () => [], resolveV1ImageModel: () => ({ providerModelId: "gpt-image-2.5-flare" }) }));
vi.mock("@/lib/security/circuitBreaker", () => ({ assertCircuitAllows: async () => ({ ok: true }) }));
vi.mock("@/lib/operations/budgetGuards", () => ({ assertBudgetGuards: async () => ({ ok: true }) }));
vi.mock("@/lib/workspaces/accountPolicyServer", () => ({ AccountPolicyError: class extends Error {}, requireBrainAccess: vi.fn(), requireStorageSpace: vi.fn() }));
vi.mock("@/lib/security/rateLimit", () => ({ checkRateLimit: async () => ({ allowed: true }) }));
vi.mock("@/lib/brain-studio/server", () => ({ loadStudioMemories: async () => [] }));
import { handleFeedCreate } from "@/lib/feed/server";
import { normalizeBrainProfile, buildBrainBrief } from "@/lib/workspaces/brainProfile";
import { defaultConfig } from "@/lib/feed/model";

describe("Marketing image regression with a long imported Brain", () => {
  it("passes the real create API and SQL limits, charges once and preserves campaign linkage", async () => {
    const owner = "11111111-1111-4111-8111-111111111111", campaignId = crypto.randomUUID(), requestId = crypto.randomUUID();
    const profile = normalizeBrainProfile({ brand: { name: "Real Soda", description: "A real soda with original packaging", category: "Drinks" }, target: { audience: "Audience context. ".repeat(47) }, market: { positioning: "Imported brand details. ".repeat(1300) }, content: { avoid: "LATE_EXCLUSION: never invent medical benefits", voice: "A human voice" } } as never);
    expect(buildBrainBrief(profile).length).toBeGreaterThan(24000); expect(profile.target.audience.length).toBeGreaterThan(300);
    m.brain.mockResolvedValue(profile); process.env.MARO_MARKETING_OPENAI_API_KEY = "synthetic-dedicated-key";
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
      await db.query("insert into auth.users values($1,'erzen@nice.al',now());", [owner]);
      await db.query("insert into profiles(id,email,credits) values($1,'erzen@nice.al',500)", [owner]);
      await db.query("insert into workspaces(id,owner_id,name) values('ws',$1,'Real Soda')", [owner]);
      await db.exec(`insert into app_settings(id,master_prompt,platform_limits) values(1,'Existing prompt','{"userHourlyUsd":1000,"userDailyUsd":1000}');`);
      await db.query("insert into storage.objects values('generations',$1,'{\"size\":100}')", [`${owner}/refs/product.png`]);
      await db.exec("set request.jwt.claim.role='service_role'");
      const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
        try {
          if (name === "maro_feed_create_v2") return { data: (await db.query<{ id: string }>("select maro_feed_create_v2($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) id", [args.p_user, args.p_workspace, args.p_request, args.p_references, args.p_category, args.p_brief, args.p_context, args.p_config, args.p_content_type, args.p_text_mode])).rows[0].id, error: null };
          if (name === "maro_feed_recover") { await db.query("select maro_feed_recover($1,$2)", [args.p_user, args.p_feed]); return { data: null, error: null }; }
          throw new Error("unexpected_rpc");
        } catch (e) { return { data: null, error: { message: (e as Error).message } }; }
      });
      m.db.mockReturnValue({ rpc, from: (table: string) => {
        let id = "";
        const row = async () => table === "workspaces" ? { id: "ws", brain_profile: profile } : table === "maro_marketing_campaigns" ? { id: campaignId, workspace_id: "ws", status: "completed", plan: { posts: Array.from({ length: 9 }, () => ({ visual: "x".repeat(1600), caption: "y".repeat(2000) })) } } : table === "maro_feed_config" ? { config: defaultConfig, revision: 0 } : table === "maro_feeds" ? (await db.query("select * from maro_feeds where id=$1", [id])).rows[0] : null;
        const q = { select: () => q, eq: (key: string, value: string) => { if (key === "id") id = value; return q; }, order: () => q, limit: () => q, maybeSingle: async () => ({ data: await row(), error: null }), single: async () => ({ data: await row(), error: null }), then: (done: (v: unknown) => void) => Promise.resolve({ data: [], error: null }).then(done) };
        return q;
      } });
      const body = { requestId, workspaceId: "ws", marketingCampaignId: campaignId, references: [`storage:generations/${owner}/refs/product.png`], category: "drinks", useBrain: true, brief: { language: "en", notes: "Halloween Sale 20% Off" } };
      const request = () => new Request("https://maro.al/api/feed", { method: "POST", headers: { authorization: "Bearer synthetic", "content-type": "application/json" }, body: JSON.stringify(body) });
      const response = await handleFeedCreate(request()); expect(await response.clone().json()).not.toHaveProperty("error"); expect(response.status).toBe(200);
      const replay = await handleFeedCreate(request()); expect(replay.status).toBe(200);
      const saved = (await db.query<{ brain_context: string; brief: { audience: string; marketing: { campaignId: string } } }>("select brain_context,brief from maro_feeds")).rows;
      expect(saved).toHaveLength(1); expect(saved[0].brain_context.length).toBeLessThan(24000); expect(saved[0].brain_context).toContain("LATE_EXCLUSION"); expect(saved[0].brief.audience.length).toBe(300);
      expect(saved[0].brief.marketing).toEqual({ campaignId }); expect(JSON.stringify(saved[0].brief).length).toBeLessThan(12000);
      expect((await db.query<{ credits: number }>("select credits from profiles where id=$1", [owner])).rows[0].credits).toBe(450);
      // The saved feed is eligible for a real first slot, rather than merely passing request validation.
      const claim = (await db.query<{ result: { claimed: boolean } }>("select maro_feed_claim($1,$2,$3,0,false,'','gpt-image-2.5-flare') result", [owner, (await response.json()).feed.id, crypto.randomUUID()])).rows[0].result;
      expect(claim.claimed).toBe(true);
    } finally { await db.close(); }
  });
});
