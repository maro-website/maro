import { it, expect } from "vitest";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin, uploadGeneratedImage, logGeneration } from "@/lib/supabase/server";
import { POST } from "@/app/api/ai/image/route";
import { DEFAULT_WIZARD_STATE } from "@/lib/marologo/defaults";
import { buildGenerationRequest } from "@/lib/marologo/generation";
import { readV1ImageModelConfiguration } from "@/lib/engine/v1ImageModels";

const USER_ID = "fec01baa-8451-4112-84fb-8552f8b31686"; // Existing internal operations account.
const runId = process.env.MARO_PHASE3_RUN_ID ?? "2026-09-17-v1";
const directory = path.resolve("scripts/phase3-data", runId);
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
function save(name: string, value: unknown) {
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, `${name}.json`), JSON.stringify(value, null, 2));
}
function checked<R extends { data: unknown; error: { message: string } | null }>(result: R): NonNullable<R["data"]> {
  if (result.error) throw new Error(result.error.message);
  return result.data as NonNullable<R["data"]>;
}

it("performs the explicitly authorized internal Phase 3 stage", async () => {
  if (process.env.MARO_PHASE3_LIVE !== "1") throw new Error("Explicit MARO_PHASE3_LIVE=1 is required");
  const stage = process.env.MARO_PHASE3_STAGE;
  if (!["preflight", "configure", "run", "failure"].includes(stage ?? "")) throw new Error("Choose preflight, configure, run or failure");
  const db = getSupabaseAdmin();
  const profile = checked(await db.from("profiles").select("id,email,is_admin,credits,credits_reserved,active_workspace_id").eq("id", USER_ID).single());
  expect(profile.is_admin).toBe(true);
  expect(profile.credits_reserved).toBe(0);
  const workspace = checked(await db.from("workspaces").select("id,owner_id").eq("id", profile.active_workspace_id).single());
  expect(workspace.owner_id).toBe(USER_ID);
  const balance = async () => checked(await db.from("profiles").select("credits,credits_reserved").eq("id", USER_ID).single());

  if (stage === "preflight") {
    for (const table of ["generation_jobs", "provider_cost_estimates", "credit_transactions", "pricing_snapshots"]) {
      checked(await db.from(table).select("*").limit(0));
    }
    const png = await sharp({ create: { width: 256, height: 256, channels: 3, background: "#355e65" } }).png().toBuffer();
    const ref = await uploadGeneratedImage(USER_ID, png.toString("base64"));
    expect(ref).toMatch(new RegExp(`^storage:generations/${USER_ID}/`));
    let generationId: string | null = null;
    try {
      generationId = await logGeneration({ user_id: USER_ID, user_email: profile.email,
        prompt: "Phase 3 storage/history probe (no provider call)", final_prompt: "Phase 3 storage/history probe (no provider call)",
        model: "phase3-storage-probe", credits_spent: 0, tool_id: "reklama", kind: "image",
        output_urls: [ref!], workspace_id: workspace.id });
      expect(generationId, "Known nullable history boundary blocked safe live testing").toBeTruthy();
      const generation = checked(await db.from("generations").select("id,user_id,output_urls").eq("id", generationId!).single());
      expect(generation.output_urls).toEqual([ref]);
      const stored = checked(await db.storage.from("generations").download(ref!.replace("storage:generations/", "")));
      expect(Buffer.from(await stored.arrayBuffer()).equals(png)).toBe(true);
      save("preflight", { ok: true, userId: USER_ID, workspaceId: workspace.id, balance: await balance(), storageRef: ref, generationId, probeRemoved: true, at: new Date().toISOString() });
      console.log("PREFLIGHT storage/history/download passed; no provider call");
    } finally {
      if (generationId) checked(await db.from("generations").delete().eq("id", generationId).eq("user_id", USER_ID));
      if (ref) checked(await db.storage.from("generations").remove([ref.replace("storage:generations/", "")]));
    }
    return;
  }

  if (!existsSync(path.join(directory, "preflight.json"))) throw new Error("Successful storage preflight required");
  if (stage === "configure") {
    const before = checked(await db.from("tool_model_configs").select("*").in("tool_id", ["maro_imazh", "maro_logo"]));
    if (!existsSync(path.join(directory, "configuration-before.json"))) save("configuration-before", before);
    // Only replace legacy default flags, retaining their rows and enabled state.
    checked(await db.from("tool_model_configs").update({ is_default: false }).in("tool_id", ["maro_imazh", "maro_logo"]).eq("is_default", true).neq("model_id", "flare"));
    for (const [module, model] of [["maro_imazh", "flare"], ["maro_imazh", "sunburst"], ["maro_logo", "flare"]] as const) {
      const previous = before.find((row) => row.tool_id === module && row.model_id === model);
      if (previous) {
        const config = readV1ImageModelConfiguration(previous, module);
        if (config.pricingStage !== "internal") throw new Error("Existing launch configuration must not be overwritten");
        continue; // Preserve approved positive internal pricing.
      }
      checked(await db.from("tool_model_configs").insert({ tool_id: module, model_id: model, provider: "openai",
        display_name: model === "flare" ? "Flare" : "Sunburst", enabled: true, coming_soon: false,
        is_default: model === "flare", sort_order: model === "flare" ? 0 : 1,
        metadata: { providerModelId: `gpt-image-2.5-${model}`, description: "Verifikim i brendshëm V1", verificationRun: runId },
        cost_metadata: { customerCredits: 1, pricingStage: "internal", purpose: "Phase 3 provider verification only; not launch pricing" },
      }));
    }
    const after = checked(await db.from("tool_model_configs").select("*").in("tool_id", ["maro_imazh", "maro_logo"]));
    save("configuration-after", after);
    console.log("CONFIGURED", after.filter((r) => ["flare", "sunburst"].includes(r.model_id)).map((r) => ({ id: r.id, module: r.tool_id, model: r.model_id, cost: r.cost_metadata })));
    return;
  }

  // Admin generateLink only produces a link; it sends no email and changes no password.
  const authUser = checked(await db.auth.admin.getUserById(USER_ID)).user;
  expect(authUser!.email).toBe(profile.email);
  const link = checked(await db.auth.admin.generateLink({ type: "magiclink", email: profile.email }));
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const verified = checked(await client.auth.verifyOtp({ token_hash: link.properties!.hashed_token, type: "magiclink" }));
  const token = verified.session!.access_token;
  const originalFetch = globalThis.fetch;
  let currentCase = "";
  let captures: Array<Record<string, unknown>> = [];
  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!/^https:\/\/api\.openai\.com\/v1\/images\/(generations|edits)/.test(url)) return originalFetch(input, init);
    const request = new Request(input, init);
    const contentType = request.headers.get("content-type") ?? "";
    let captured: Record<string, unknown>;
    if (contentType.includes("json")) captured = await request.clone().json();
    else {
      const form = await request.clone().formData();
      captured = Object.fromEntries([...form.entries()].filter(([, value]) => typeof value === "string"));
      captured.referenceCount = [...form.entries()].filter(([, value]) => typeof value !== "string").length;
    }
    // Never retain headers, credentials, or image bytes in request diagnostics.
    captures.push({ operation: url.endsWith("edits") ? "edit" : "generate", ...captured });
    save(`${currentCase}-executed`, captures);
    if (currentCase.startsWith("F-controlled-failure")) {
      save(`${currentCase}-during`, await balance());
      return Response.json({ error: { message: "Phase 3 controlled local provider rejection", type: "invalid_request_error", code: "phase3_controlled_rejection" } }, { status: 400, headers: { "x-request-id": "mock_phase3_controlled_rejection" } });
    }
    return originalFetch(request);
  };

  const base = { toolId: "reklama", n: 1, quality: "high", workspaceId: workspace.id, useWorkspaceBrand: false,
    selections: { format: "fb-post", text: "off" } };
  const prompts = {
    A: "Create a premium commercial photograph of one unbranded matte teal reusable water bottle centered on a pale sand stone pedestal. Soft warm side light from the left, realistic contact shadow, quiet cream background, generous negative space, crisp product edges. No letters, numbers, logos or extra objects.",
    B: "Design a polished advertising poster for a fictional coffee shop. One white ceramic coffee cup on the lower right, warm ivory background, restrained dark brown and rust palette. Include exactly these three readable English lines, with no additional text: FRESH START / COFFEE & CALM / OPEN DAILY 7 AM. Large headline at top left, second line below, small opening hours at bottom left. Preserve all spelling, ampersand and numbers.",
    C: "Create a photorealistic commercial still life with exactly five objects on a pale blue table: a clear glass vase holding three yellow tulips at the back left, a closed red notebook flat at front left, a green pear in the center, a white ceramic teacup with its handle pointing right at front right, and a brass desk clock at back right. All objects fully visible and separated. Background is a softly lit cream wall with one diagonal window shadow. No lettering, extra objects, people or cropped objects.",
    D: "Edit the provided commercial photograph. Keep exactly the same bottle shape, camera view, pedestal and composition. Change only the bottle body color from teal to burnt orange and change the background from cream to muted pale blue. Preserve realistic lighting and shadows. Add no words, logos or objects.",
  };
  const wizard = structuredClone(DEFAULT_WIZARD_STATE);
  wizard.brand = { name: "NORTHLINE", slogan: "", description: "An independent outdoor equipment brand making durable minimalist hiking packs and trail accessories.", industry: "", industryOther: "", audience: "Adults who hike and value reliable, understated equipment." };
  wizard.logo.type = "symbol_wordmark";
  wizard.logo.symbolMeaning = "An original compact geometric symbol suggesting a northward trail and mountain ridge.";
  wizard.logo.avoid = "Generic stock mountains, gradients, extra words, mock slogans and fine details.";
  wizard.look.colors = { mode: "custom", values: ["#193E35", "#F3EEE3"] };
  const cases: Array<{ id: string; request: Record<string, unknown> }> = [
    { id: "F-controlled-failure", request: { ...base, model: "flare", prompt: prompts.A } },
    ...["A", "B", "C", "D"].flatMap((test) => ["flare", "sunburst"].map((model) => ({ id: `${test}-${model}`, request: { ...base, model, prompt: prompts[test as keyof typeof prompts], selections: { format: "fb-post", text: test === "B" ? "on" : "off" } } }))),
    { id: "E-logo-flare", request: { ...buildGenerationRequest(wizard, []), workspaceId: workspace.id } },
  ];
  try {
    const selectedCases = stage === "failure" ? [{ ...cases[0], id: "F-controlled-failure-confirmed" }] : cases;
    for (const entry of selectedCases) {
      currentCase = entry.id;
      const resultPath = path.join(directory, `${entry.id}-result.json`);
      if (existsSync(resultPath)) {
        const previous = JSON.parse(readFileSync(resultPath, "utf8"));
        if (previous.blocker) throw new Error(`Existing blocker in ${entry.id}; review before any rerun`);
        console.log("SKIP already recorded", entry.id);
        continue;
      }
      if (entry.id.startsWith("D-")) {
        const reference = JSON.parse(readFileSync(path.join(directory, "A-flare-result.json"), "utf8"));
        entry.request.attachments = reference.result.storageRefs;
      }
      captures = [];
      const before = await balance();
      const idempotencyKey = `phase3-${runId}-${entry.id}`;
      // Refuse rerunning a provider request after an interrupted checkpoint.
      const existing = checked(await db.from("generation_jobs").select("id,status").eq("user_id", USER_ID).eq("idempotency_key", idempotencyKey));
      if (existing.length) throw new Error(`Interrupted case ${entry.id} has existing job ${existing[0].id}; reconcile manually`);
      console.log("START", entry.id, before);
      save(`${entry.id}-input`, entry.request);
      const response = await POST(new Request("http://localhost/api/ai/image", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...entry.request, idempotencyKey }) }));
      const during = await balance();
      const raw = await response.text();
      const events = raw.split("\n").filter((line) => line.startsWith("data:")).map((line) => JSON.parse(line.slice(5).trim()));
      const result = events.findLast((event) => typeof event.ok === "boolean") ?? { ok: false, responseStatus: response.status, error: raw.slice(0, 2000) };
      const job = checked(await db.from("generation_jobs").select("*").eq("user_id", USER_ID).eq("idempotency_key", idempotencyKey).maybeSingle());
      const after = await balance();
      const ledger = job ? checked(await db.from("credit_transactions").select("*").eq("job_id", job.id)) : [];
      const costs = job ? checked(await db.from("provider_cost_estimates").select("*").eq("job_id", job.id)) : [];
      const generation = result.generationId ? checked(await db.from("generations").select("*").eq("id", result.generationId).single()) : null;
      let stored = false;
      if (generation?.output_urls?.length === 1) {
        const ref = generation.output_urls[0];
        if (ref.startsWith(`storage:generations/${USER_ID}/`)) {
          const blob = checked(await db.storage.from("generations").download(ref.replace("storage:generations/", "")));
          const bytes = Buffer.from(await blob.arrayBuffer());
          const info = await sharp(bytes).metadata();
          stored = info.width === 1024 && info.height === 1024;
          writeFileSync(path.join(directory, `${entry.id}.png`), bytes);
        }
      }
      const executedPrompt = String(captures[0]?.prompt ?? "");
      const promptMatches = generation ? hash(generation.final_prompt) === hash(executedPrompt) : null;
      const expectedModel = `gpt-image-2.5-${entry.request.model ?? "flare"}`;
      const blocker = entry.id.startsWith("F-controlled-failure")
        ? (result.ok || job?.status !== "failed" || before.credits !== after.credits || after.credits_reserved !== 0 || captures.length !== 1)
        : (!result.ok || !stored || !generation || job?.status !== "completed" || after.credits_reserved !== 0 || captures.length !== 1 || captures[0]?.model !== expectedModel || costs.length !== 1);
      const safeResult = { ...result, images: undefined }; // Signed display URLs expire; retain canonical storage refs instead.
      save(`${entry.id}-result`, { case: entry.id, before, during, after, result: safeResult, job, ledger, costs, generation, stored, promptMatches, capturedRequestCount: captures.length, blocker });
      console.log("RESULT", entry.id, { ok: result.ok, status: job?.status, stored, promptMatches, before, during, after, observation: job?.metadata?.execution?.image_provider, blocker });
      if (blocker) throw new Error(`Phase 3 stopped at ${entry.id}; inspect recorded blocker without repeating provider call`);
      expect(captures[0]?.model).toBe(expectedModel);
    }
  } finally {
    globalThis.fetch = originalFetch;
    await client.auth.signOut({ scope: "local" });
  }
});
