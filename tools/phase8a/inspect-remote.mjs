// Read-only Phase 8A checks. No reconciliation, writes, email, or provider calls.
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";

async function inspect() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(30000) }) },
  });
  const queries = {
    lifecycle: db.rpc("v1_image_lifecycle_version"),
    models: db.from("tool_model_configs").select("tool_id,model_id,enabled,is_default,cost_metadata").in("tool_id", ["maro_imazh", "maro_logo"]).in("model_id", ["flare", "sunburst"]),
    prompts: db.from("system_prompt_versions").select("id,tool_id,version_label,status").in("tool_id", ["maro_imazh", "maro_logo"]).eq("status", "live"),
    logoContent: db.from("app_settings").select("logo_wizard_content").eq("id", 1).single(),
    operations: db.rpc("admin_v1_operations"),
    buckets: db.storage.listBuckets(),
    jobs: db.from("generation_jobs").select("id").in("status", ["pending", "reserved", "processing"]).limit(1),
    generations: db.from("generations").select("id", { head: true }).limit(1),
    emails: db.from("email_settings").select("provider,from_email,reply_to").eq("id", "default").maybeSingle(),
  };
  const entries = await Promise.all(Object.entries(queries).map(async ([name, query]) => [name, await query]));
  const r = Object.fromEntries(entries);
  const checks = Object.fromEntries(entries.map(([name, response]) => [name, { ok: !response.error,
    ...(response.error ? { code: /^[A-Z0-9]{3,10}$/.test(response.error.code ?? "") ? response.error.code : "read_failed" } : {}),
  }]));
  const result = {
    checkedAt: new Date().toISOString(), checks,
    lifecycleVersion: r.lifecycle.data ?? null,
    models: (r.models.data ?? []).map(m => ({ tool: m.tool_id, model: m.model_id, enabled: m.enabled, default: m.is_default, credits: m.cost_metadata?.customerCredits })),
    publishedPrompts: r.prompts.data ?? [],
    migration0049: { logoContentAvailable: !r.logoContent.error, operationsAvailable: !r.operations.error },
    operations: r.operations.data ? {
      counts: r.operations.data.counts,
      eligibleCount: r.operations.data.jobs?.filter(j => j.eligible).length,
    } : null,
    hasInFlightJobs: r.jobs.error ? null : Boolean(r.jobs.data?.length),
    buckets: (r.buckets.data ?? []).filter(b => ["generations", "maro-public"].includes(b.name)).map(b => ({ name: b.name, public: b.public, fileSizeLimit: b.file_size_limit, allowedMimeTypes: b.allowed_mime_types })),
    emailSettings: { rowPresent: Boolean(r.emails.data), provider: r.emails.data?.provider ?? null, senderConfigured: Boolean(r.emails.data?.from_email), replyToConfigured: Boolean(r.emails.data?.reply_to) },
    productionMutations: 0, providerCalls: 0,
  };
  const models = result.models;
  // Email configuration is reported separately; signup stays disabled in Phase 8A.
  result.v1Ready = Object.entries(checks).filter(([name]) => name !== "emails").every(([, c]) => c.ok) && result.lifecycleVersion === 2 &&
    models.length === 3 && models.every(m => m.enabled && m.credits === 5 && m.default === (m.model === "flare")) &&
    result.publishedPrompts.some(p => p.tool_id === "maro_imazh" && p.id === "a8cde7e4-b3c4-4f08-9ea4-6ce9f5970ac1") &&
    result.publishedPrompts.some(p => p.tool_id === "maro_logo" && p.id === "d5869284-7e7a-4b07-ae37-8bed138d97c8") &&
    result.buckets.some(b => b.name === "generations" && !b.public) &&
    result.buckets.some(b => b.name === "maro-public" && b.public) && result.hasInFlightJobs === false &&
    result.operations?.counts?.stale === 0 && result.operations?.counts?.settlementPending === 0;
  mkdirSync("scripts/phase8a-data", { recursive: true });
  writeFileSync("scripts/phase8a-data/remote-readiness.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.v1Ready ? 0 : 1;
}

inspect().catch(() => { console.error("phase8a_readiness_failed"); process.exitCode = 1; });
