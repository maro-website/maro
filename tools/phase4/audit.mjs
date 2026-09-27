// Read-only audit of the three persisted live checks; no provider calls.
import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const directory = "scripts/phase4-data/";
const rows = ["imazh-flare", "imazh-sunburst", "logo-flare"].map((id) => {
  const r = JSON.parse(fs.readFileSync(`${directory}${id}-result.json`, "utf8"));
  const wire = JSON.parse(fs.readFileSync(`${directory}${id}-wire.json`, "utf8"));
  const canonical = r.trace.snapshot.canonical;
  const observed = r.job.metadata.execution.image_provider;
  assert.equal(wire.length, 1);
  assert.equal(wire[0].prompt, canonical.prompt);
  const hash = createHash("sha256").update(wire[0].prompt).digest("hex");
  assert.equal(hash, canonical.provenance.promptHash);
  assert.equal(hash, observed.promptSha256);
  assert.equal(hash, r.job.metadata.canonical_prompt.hash);
  assert.equal(r.job.metadata.canonical_prompt.configurationHash, canonical.configurationHash);
  for (const model of [r.job.model, r.generation.model, observed.requestedModel, canonical.model]) assert.equal(model, wire[0].model);
  assert.equal(r.job.status, "completed");
  assert.equal(r.generation.final_prompt, "");
  assert.equal(r.result.creditsSpent, 5);
  assert.equal(r.job.credits_charged, 5);
  assert.equal(r.generation.credits_spent, 5);
  assert.equal(r.trace.snapshot.configured_credits, 5);
  assert.equal(r.trace.snapshot.request.model.pricingStage, "launch");
  assert.equal(r.before.credits - r.after.credits, 5);
  assert.equal(r.after.credits_reserved, 0);
  assert.deepEqual(r.ledger.map((l) => l.type).sort(), ["charge", "reserve"]);
  assert.ok(r.ledger.every((l) => l.amount === 5));
  assert.equal(r.image.width, 1024); assert.equal(r.image.height, 1024);
  assert.equal(canonical.provenance.brainUsed, false);
  return { case: id, jobId: r.job.id, generationId: r.generation.id, traceId: r.trace.id,
    providerModel: wire[0].model, providerRequestId: observed.requestId, latencyMs: observed.latencyMs,
    hash, configurationHash: canonical.configurationHash, system: canonical.provenance.system, layers: canonical.provenance.layers,
    before: r.before, during: r.during, after: r.after, credits: 5, stored: true,
    usage: observed.usage, previewMfaGated: r.previewMfaGated, recoveredAfterHarnessInterruption: r.recoveredAfterHarnessInterruption ?? false };
});
assert.equal(rows[0].hash, rows[1].hash);
const result = { assertions: "passed", rows, charged: 15, before: rows[0].before, after: rows[2].after };
fs.writeFileSync(`${directory}audit.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
