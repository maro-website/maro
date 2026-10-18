import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RECRAFT_MODELS } from "@/lib/ai/recraftModels";

describe("Recraft catalog migration and atomic model editing", () => {
  it("keeps existing prices, restricts writes to service role, and atomically filters/reprices all variants", async () => {
    const db = new PGlite();
    try {
      await db.exec(`create role anon; create role authenticated; create role service_role;
        create table tool_engine_config(tool_id text primary key);
        insert into tool_engine_config values ('maro_imazh'),('maro_logo');
        create table tool_model_configs(id uuid default gen_random_uuid(),tool_id text,model_id text,display_name text,provider text,
          enabled boolean,is_default boolean,is_fallback boolean default false,coming_soon boolean default false,sort_order integer,
          cost_metadata jsonb,metadata jsonb,updated_at timestamptz default now(),unique(tool_id,model_id));
        create unique index one_default on tool_model_configs(tool_id) where is_default;
        insert into tool_model_configs(tool_id,model_id,display_name,provider,enabled,is_default,sort_order,cost_metadata,metadata) values
          ('maro_imazh','flare','Flare','openai',true,true,0,'{"customerCredits":7,"pricingStage":"internal"}','{"providerModelId":"gpt-image-2.5-flare","description":"existing"}'),
          ('maro_imazh','sunburst','Sunburst','openai',true,false,1,'{"customerCredits":8,"pricingStage":"internal"}','{"providerModelId":"gpt-image-2.5-sunburst","description":"existing"}');`);
      const sql = readFileSync("supabase/migrations/0074_recraft_image_pilot.sql", "utf8");
      await db.exec(sql); await db.exec(sql);
      const { rows } = await db.query<{ key: string; label: string; descriptor: string; enabled: boolean; isDefault: boolean; order: number; customerCredits: number }>(`select model_id as key,display_name as label,metadata->>'description' as descriptor,enabled,is_default as "isDefault",sort_order as "order",(cost_metadata->>'customerCredits')::int as "customerCredits" from tool_model_configs order by sort_order`);
      expect(rows).toHaveLength(23); expect(rows[0].customerCredits).toBe(7); expect(rows[1].customerCredits).toBe(8);
      expect(rows.slice(2).map((row) => row.key)).toEqual(RECRAFT_MODELS.map((model) => model.id));
      expect(rows.slice(2).every((row) => row.customerCredits === 5 && !row.isDefault)).toBe(true);
      const access = await db.query<{ anon: boolean; authenticated: boolean; service: boolean }>(`select has_function_privilege('anon','admin_save_v1_models(text,jsonb)','execute') as anon,has_function_privilege('authenticated','admin_save_v1_models(text,jsonb)','execute') as authenticated,has_function_privilege('service_role','admin_save_v1_models(text,jsonb)','execute') as service`);
      expect(access.rows[0]).toEqual({ anon: false, authenticated: false, service: true });
      rows[2].customerCredits = 13; rows[3].enabled = false;
      await db.query("select admin_save_v1_models('maro_imazh',$1::jsonb)", [JSON.stringify(rows)]);
      expect((await db.query<{ credits: number }>("select (cost_metadata->>'customerCredits')::int as credits from tool_model_configs where model_id='recraftv4_1'")).rows[0].credits).toBe(13);
      rows[0].isDefault = false; rows[2].isDefault = true;
      await expect(db.query("select admin_save_v1_models('maro_imazh',$1::jsonb)", [JSON.stringify(rows)])).rejects.toThrow("invalid_model_configuration");
      expect((await db.query<{ model_id: string }>("select model_id from tool_model_configs where is_default")).rows[0].model_id).toBe("flare");
      await expect(db.query("select admin_save_v1_models('maro_imazh',$1::jsonb)", [JSON.stringify(rows.slice(1))])).rejects.toThrow("invalid_model_set");
    } finally { await db.close(); }
  });
});
