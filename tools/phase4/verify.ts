import { it, expect } from "vitest";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getTool, resolveOptionPrompt, composeToolPrompt, visibleSettings } from "@/lib/tools/registry";
import { IMAGE_REFERENCE_PRESERVATION, LOGO_REFERENCE_DIRECTION, IMAGE_TEXT_OFF_NO_REFERENCE, IMAGE_TEXT_OFF_WITH_REFERENCE } from "@/lib/engine/imageCompile";
import { buildCanonicalImagePrompt, loadProductionImagePrompt, promptHash, compileTrustedImageRequest } from "@/lib/generation/v1ImagePrompt";
import { parseV1ImageRequest, resolveV1ImageRequest } from "@/lib/generation/v1ImageRequest";
import { buildGenerationRequest } from "@/lib/marologo/generation";
import { DEFAULT_WIZARD_STATE } from "@/lib/marologo/defaults";
import { POST } from "@/app/api/ai/image/route";
import { POST as preview } from "@/app/api/admin/engine/compile/route";
import sharp from "sharp";

const dir = "scripts/phase4-data/";
const USER = "fec01baa-8451-4112-84fb-8552f8b31686";
function save(name: string, value: unknown) { writeFileSync(`${dir}${name}.json`, JSON.stringify(value, null, 2)); }
function check<R extends { data: unknown; error: { message: string } | null }>(r: R): NonNullable<R["data"]> { if (r.error) throw Error(r.error.message); return r.data as NonNullable<R["data"]>; }

it("runs the explicitly selected Phase 4 internal stage", async () => {
  if (process.env.MARO_PHASE4_APPROVED !== "1") throw Error("Explicit opt-in required");
  const db = getSupabaseAdmin();
  const stage = process.env.MARO_PHASE4_STAGE;
  const before = JSON.parse(readFileSync(`${dir}before.json`, "utf8"));
  const prompts = before.settings[0].tool_prompts as Record<string, string>;
  if (stage === "configure") {
    const migration: unknown[] = [];
    for (const [module, toolId] of [["maro_imazh", "reklama"], ["maro_logo", "logo"]] as const) {
      const tool = getTool(toolId)!;
      const activeBase = (prompts[`${toolId}.base`] ?? tool.defaultPrompt ?? "").trim();
      expect(activeBase.length).toBeGreaterThan(100);
      const live = check(await db.from("system_prompt_versions").select("*").eq("tool_id", module).eq("status", "live"));
      expect(live.length).toBe(1);
      if (live[0].content.trim() !== activeBase) {
        // Preserve the older Engine version; publish the actual production content without generic seeding.
        check(await db.from("system_prompt_versions").insert({ tool_id: module, version_label: "v1-canonical-phase4", status: "draft", content: activeBase,
          change_note: "Phase 4: exact active app_settings base, preserving previous Engine version in archive", created_by: USER }));
        check(await db.from("system_prompt_versions").update({ status: "archived" }).eq("id", live[0].id).eq("status", "live"));
        check(await db.from("system_prompt_versions").update({ status: "live", published_by: USER, published_at: new Date().toISOString() }).eq("tool_id", module).eq("version_label", "v1-canonical-phase4"));
      }
      const definitions: Array<{ key: string; content: string; priority: number; conditions: Array<{ field: string; equals: string[] }> }> = [];
      for (const [index, setting] of tool.settings.entries()) {
        if (setting.id === "model") continue;
        for (const option of setting.options) {
          if (option.available === false || (module === "maro_logo" && setting.id === "speed" && option.id !== "normal")) continue;
          const content = resolveOptionPrompt(prompts, toolId, setting.id, option.id)?.trim();
          if (!content) continue;
          const conditions = [{ field: `selections.${setting.id}`, equals: [option.id] }];
          if (setting.showWhen) conditions.push({ field: `selections.${setting.showWhen.setting}`, equals: setting.showWhen.in });
          definitions.push({ key: `v1.production.option.${setting.id}.${option.id}`, content, priority: 900 - index, conditions });
        }
      }
      if (module === "maro_imazh") {
        definitions.push({ key: "v1.production.reference.owned", content: IMAGE_REFERENCE_PRESERVATION, priority: 100, conditions: [{ field: "hasReferences", equals: ["true"] }] });
        for (const hasReferences of [false, true]) definitions.push({ key: `v1.production.output.text_off.${hasReferences ? "reference" : "plain"}`, content: hasReferences ? IMAGE_TEXT_OFF_WITH_REFERENCE : IMAGE_TEXT_OFF_NO_REFERENCE, priority: 0, conditions: [{ field: "selections.text", equals: ["off"] }, { field: "hasReferences", equals: [String(hasReferences)] }] });
        for (const font of tool.settings.find((s) => s.id === "font")!.options) definitions.push({ key: `v1.production.output.text_on.${font.id}`, content: `Text: render any requested headline/text cleanly and legibly, spelling every word correctly. Use a ${font.label} typography style.`, priority: 0, conditions: [{ field: "selections.text", equals: ["on"] }, { field: "selections.font", equals: [font.id] }] });
      } else definitions.push({ key: "v1.production.reference.design", content: LOGO_REFERENCE_DIRECTION, priority: 100, conditions: [{ field: "hasReferences", equals: ["true"] }] });
      for (const d of definitions) {
        const existing = check(await db.from("prompt_layers").select("*").eq("tool_id", module).eq("layer_key", d.key).maybeSingle());
        if (existing) { expect(existing.instructions).toBe(d.content); continue; }
        check(await db.from("prompt_layers").insert({ tool_id: module, layer_key: d.key, name: d.key, status: "live", enabled: true, priority: d.priority,
          conditions: d.conditions, instructions: d.content, version_label: "phase4-migrated-1", created_by: USER, updated_by: USER }));
      }
      // Component parity: preserve the exact active base and every selectable option fragment.
      const config = await loadProductionImagePrompt(module);
      expect(config.system.content.trim()).toBe(activeBase);
      for (const d of definitions) expect(config.layers.find((l) => l.layer_key === d.key)?.instructions).toBe(d.content);
      migration.push({ module, systemId: config.system.id, systemVersion: config.system.version_label, baseHash: promptHash(activeBase), layers: config.layers.map((l) => ({ id: l.id, key: l.layer_key, hash: promptHash(l.instructions) })) });
    }
    for (const [module, model, descriptor] of [["maro_imazh", "flare", "Fast · Recommended"], ["maro_imazh", "sunburst", "Alternative · More deliberate"], ["maro_logo", "flare", "Fast · Recommended"]]) {
      const row = check(await db.from("tool_model_configs").select("*").eq("tool_id", module).eq("model_id", model).single());
      check(await db.from("tool_model_configs").update({ metadata: { ...row.metadata, description: descriptor, verificationRun: null },
        cost_metadata: { customerCredits: 5, pricingStage: "launch", purpose: "Approved V1 product configuration — Phase 4" }, is_default: model === "flare" }).eq("id", row.id));
    }
    save("configuration", migration);
    console.log("CONFIGURATION migrated with exact component parity; all three approved model prices are 5");
    return;
  }
  if (stage === "privacy") {
    const rows = check(await db.from("generations").select("id,user_id,tool_id,final_prompt").in("tool_id", ["reklama", "logo"]).not("final_prompt", "is", null).neq("final_prompt", ""));
    const migrated: string[] = [];
    for (const row of rows) {
      const previous = check(await db.from("pricing_snapshots").select("id,snapshot").eq("generation_id", row.id).contains("snapshot", { record_type: "legacy_image_prompt" }));
      if (!previous.length) check(await db.from("pricing_snapshots").insert({ generation_id: row.id, user_id: row.user_id, kind: "generation", snapshot: { record_type: "legacy_image_prompt", module: row.tool_id, prompt: row.final_prompt, promptHash: promptHash(row.final_prompt) } }));
      const verified = check(await db.from("pricing_snapshots").select("snapshot").eq("generation_id", row.id).contains("snapshot", { record_type: "legacy_image_prompt" }).single());
      expect(verified.snapshot.prompt).toBe(row.final_prompt);
      check(await db.from("generations").update({ final_prompt: "" }).eq("id", row.id).eq("final_prompt", row.final_prompt));
      migrated.push(row.id);
    }
    save("privacy", { movedToAdminOnlySnapshots: migrated, remaining: check(await db.from("generations").select("id").in("tool_id", ["reklama", "logo"]).not("final_prompt", "is", null).neq("final_prompt", "")) });
    console.log("PRIVACY preserved and removed internal history prompts", migrated.length);
    return;
  }
  if (stage !== "live") throw Error("Choose configure, privacy or live");
  const profile = check(await db.from("profiles").select("email,is_admin,credits,credits_reserved,active_workspace_id").eq("id", USER).single());
  expect(profile.is_admin).toBe(true); expect(profile.credits_reserved).toBe(0);
  const link = check(await db.auth.admin.generateLink({ type: "magiclink", email: profile.email }));
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const session = check(await client.auth.verifyOtp({ token_hash: link.properties!.hashed_token, type: "magiclink" }));
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${session.session!.access_token}` };
  const balance = async () => check(await db.from("profiles").select("credits,credits_reserved").eq("id", USER).single());
  const wizard = structuredClone(DEFAULT_WIZARD_STATE); wizard.brand.name = "RIDGELINE"; wizard.brand.description = "A maker of durable minimalist outdoor backpacks.";
  const cases = [
    { id: "imazh-flare", body: { toolId: "reklama", model: "flare", prompt: "A premium commercial photograph of one matte green reusable bottle on a limestone plinth. Warm cream background, soft side lighting, no text, no other objects.", selections: { format: "fb-post" } } },
    { id: "imazh-sunburst", body: { toolId: "reklama", model: "sunburst", prompt: "A premium commercial photograph of one matte green reusable bottle on a limestone plinth. Warm cream background, soft side lighting, no text, no other objects.", selections: { format: "fb-post" } } },
    { id: "logo-flare", body: buildGenerationRequest(wizard, []) },
  ];
  const originalFetch = globalThis.fetch;
  let wire: Record<string, unknown>[] = [];
  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (/^https:\/\/api\.openai\.com\/v1\/images\//.test(url)) {
      const request = new Request(input, init); wire.push(await request.clone().json()); return originalFetch(request);
    }
    return originalFetch(input, init);
  };
  try {
    for (const entry of cases) {
      if (process.env.MARO_PHASE4_CASE && process.env.MARO_PHASE4_CASE !== entry.id) continue;
      if (existsSync(`${dir}${entry.id}-result.json`)) throw Error(`Already recorded ${entry.id}; do not repeat live calls`);
      const body = { ...entry.body, workspaceId: profile.active_workspace_id, idempotencyKey: `phase4-canonical-v1-${entry.id}` };
      const existing = check(await db.from("generation_jobs").select("id").eq("user_id", USER).eq("idempotency_key", body.idempotencyKey));
      if (existing.length) throw Error("Interrupted request requires reconciliation before retry");
      const compiled = await compileTrustedImageRequest(await resolveV1ImageRequest(parseV1ImageRequest(body), USER));
      const admin = await preview(new Request("http://localhost/api/admin/engine/compile", { method: "POST", headers, body: JSON.stringify({ toolId: body.toolId === "logo" ? "maro_logo" : "maro_imazh", ownerUserId: USER, imageRequest: body }) }));
      const previewBody = await admin.json();
      save(`${entry.id}-preview`, previewBody);
      const previewMfaGated = admin.status === 403 && previewBody.error === "mfa_challenge_required";
      if (previewMfaGated) console.log("LIVE ADMIN PREVIEW MFA-gated; handler parity is verified in unit tests, no auth bypass");
      else {
        expect(admin.status, JSON.stringify(previewBody)).toBe(200);
        expect(previewBody.canonical.prompt).toBe(compiled.compilation.prompt);
      }
      const beforeBalance = await balance(); wire = [];
      save(`${entry.id}-before`, beforeBalance);
      console.log("LIVE START", entry.id, beforeBalance);
      const response = await POST(new Request("http://localhost/api/ai/image", { method: "POST", headers, body: JSON.stringify(body) }));
      const during = await balance();
      save(`${entry.id}-during`, during);
      const raw = await response.text();
      const result = raw.split("\n").filter((s) => s.startsWith("data:")).map((s) => JSON.parse(s.slice(5))).findLast((e) => typeof e.ok === "boolean");
      save(`${entry.id}-wire`, wire);
      save(`${entry.id}-initial-result`, { ...result, images: undefined, raw: result ? undefined : raw });
      expect(result?.ok).toBe(true);
      const job = check(await db.from("generation_jobs").select("*").eq("id", result.jobId).single());
      const generation = check(await db.from("generations").select("*").eq("id", result.generationId).single());
      const trace = check(await db.from("pricing_snapshots").select("*").eq("job_id", result.jobId).contains("snapshot", { record_type: "v1_image_execution" }).single());
      const ledger = check(await db.from("credit_transactions").select("*").eq("job_id", result.jobId));
      const after = await balance();
      const blob = check(await db.storage.from("generations").download(result.storageRefs[0].replace("storage:generations/", "")));
      const bytes = Buffer.from(await blob.arrayBuffer()); writeFileSync(`${dir}${entry.id}.png`, bytes);
      const image = await sharp(bytes).metadata();
      save(`${entry.id}-result`, { before: beforeBalance, during, after, previewMfaGated, result: { ...result, images: undefined }, job, generation, trace, ledger, image });
      expect(wire.length).toBe(1);
      expect(wire[0].prompt).toBe(compiled.compilation.prompt);
      expect(wire[0].prompt).toBe(trace.snapshot.canonical.prompt);
      expect(promptHash(String(wire[0].prompt))).toBe(job.metadata.canonical_prompt.hash);
      expect(wire[0].model).toBe(job.model);
      expect(job.metadata.execution.image_provider.requestedModel).toBe(job.model);
      expect(job.metadata.execution.image_provider.promptSha256).toBe(job.metadata.canonical_prompt.hash);
      expect(generation.final_prompt).toBe("");
      expect(generation.credits_spent).toBe(5); expect(job.credits_charged).toBe(5);
      expect(beforeBalance.credits - after.credits).toBe(5); expect(after.credits_reserved).toBe(0);
      expect(image.width).toBe(1024); expect(image.height).toBe(1024);
      console.log("LIVE PASS", entry.id, { job: job.id, generation: generation.id, requestId: job.metadata.execution.image_provider.requestId, hash: job.metadata.canonical_prompt.hash, after });
    }
  } finally { globalThis.fetch = originalFetch; await client.auth.signOut({ scope: "local" }); }
});
