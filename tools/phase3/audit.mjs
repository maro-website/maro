// Read-only audit of checkpoints. Never calls a provider or mutates the database.
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import path from "node:path";
import { createHash } from "node:crypto";

const directory = path.resolve("scripts/phase3-data", process.env.MARO_PHASE3_RUN_ID ?? "2026-09-17-v1");
const read = (name) => JSON.parse(readFileSync(path.join(directory, `${name}.json`), "utf8"));
const cases = [...["A", "B", "C", "D"].flatMap((letter) => ["flare", "sunburst"].map((model) => `${letter}-${model}`)), "E-logo-flare"];
const rows = cases.map((id) => {
  const r = read(`${id}-result`);
  const [wire] = read(`${id}-executed`);
  const observation = r.job.metadata.execution.image_provider;
  const snapshot = r.job.metadata.v1_request;
  const price = snapshot.model.customerCredits;
  assert.equal(r.blocker, false);
  assert.equal(r.stored, true);
  assert.equal(r.capturedRequestCount, 1);
  // Multipart form serialization changes LF to CRLF. Preserve the raw mismatch in
  // the report while checking that it introduced no semantic prompt difference.
  const normalizedWirePrompt = wire.prompt.replace(/\r\n/g, "\n");
  assert.equal(normalizedWirePrompt, r.generation.final_prompt.replace(/\r\n/g, "\n"));
  assert.equal(createHash("sha256").update(normalizedWirePrompt).digest("hex"), observation.promptSha256);
  for (const model of [wire.model, r.job.model, r.generation.model, r.costs[0].model_id, observation.requestedModel]) assert.equal(model, snapshot.model.providerModelId);
  assert.equal(r.costs[0].provider, snapshot.model.provider);
  assert.equal(r.costs[0].cost_source, "usage_calculated");
  assert.equal(r.costs[0].reconciliation_status, "estimated");
  assert.equal(r.costs[0].estimated_cost_usd, observation.estimate.usd);
  assert.equal(r.costs[0].generation_id, r.generation.id);
  assert.equal(r.costs[0].job_id, r.job.id);
  for (const amount of [r.result.creditsSpent, r.generation.credits_spent, r.job.credits_charged, r.before.credits - r.after.credits]) assert.equal(amount, price);
  assert.equal(r.after.credits_reserved, 0);
  assert.equal(r.during.credits_reserved, price);
  assert.deepEqual(r.ledger.map((l) => l.type).sort(), ["charge", "reserve"]);
  assert.ok(r.ledger.every((l) => l.amount === price));
  assert.ok(observation.requestId);
  assert.equal(observation.providerReportedCostUsd, null);
  assert.equal(Number(wire.n), 1);
  assert.equal(wire.quality, "high");
  assert.equal(wire.size, "1024x1024");
  assert.equal(snapshot.useBrain, false);
  if (id.startsWith("D-")) {
    assert.equal(wire.operation, "edit");
    assert.equal(wire.referenceCount, 1);
    assert.equal(snapshot.references[0].id, read("A-flare-result").result.storageRefs[0]);
  } else assert.equal(wire.operation, "generate");
  return { case: id, logicalModel: snapshot.logicalModel, model: wire.model, operation: wire.operation,
    jobId: r.job.id, generationId: r.generation.id, storageRef: r.result.storageRefs[0],
    requestId: observation.requestId, startedAt: observation.startedAt, completedAt: observation.completedAt,
    seconds: observation.latencyMs / 1000, usage: observation.usage, estimateUsd: observation.estimate.usd,
    credits: price, before: r.before, during: r.during, after: r.after, promptSha256: observation.promptSha256,
    rawPromptMatches: r.promptMatches, normalizedPromptMatches: true,
    referenceDigest: snapshot.references[0]?.digest ?? null };
});
for (const letter of ["A", "B", "C", "D"]) {
  const a = read(`${letter}-flare-executed`)[0], b = read(`${letter}-sunburst-executed`)[0];
  assert.deepEqual({ ...a, model: undefined }, { ...b, model: undefined });
}
assert.equal(rows[6].referenceDigest, rows[7].referenceDigest);
for (const id of ["F-controlled-failure", "F-controlled-failure-confirmed"]) {
  const failure = read(`${id}-result`);
  const [wire] = read(`${id}-executed`);
  assert.equal(failure.result.ok, false);
  assert.equal(failure.job.status, "failed");
  assert.equal(failure.job.credits_charged, 0);
  assert.equal(failure.before.credits, failure.after.credits);
  assert.equal(failure.during.credits_reserved, 1);
  assert.equal(failure.after.credits_reserved, 0);
  assert.equal(failure.capturedRequestCount, 1);
  assert.equal(wire.model, "gpt-image-2.5-flare");
  assert.deepEqual(failure.ledger.map((l) => l.type).sort(), ["release", "reserve"]);
  assert.ok(failure.ledger.every((l) => l.amount === 1));
  assert.equal(failure.job.metadata.execution.image_provider.error.code, "phase3_controlled_rejection");
  if (id.endsWith("confirmed")) assert.equal(failure.job.metadata.execution.image_provider.requestId, "mock_phase3_controlled_rejection");
}
const means = Object.fromEntries(["flare", "sunburst"].map((model) => {
  const group = rows.filter((row) => row.logicalModel === model && row.case !== "E-logo-flare");
  return [model, { count: group.length, meanSeconds: group.reduce((a, r) => a + r.seconds, 0) / group.length, meanEstimateUsd: group.reduce((a, r) => a + r.estimateUsd, 0) / group.length }];
}));
const summary = { checkedAt: new Date().toISOString(), assertions: "passed", rows, means,
  totalEstimateUsd: rows.reduce((a, r) => a + r.estimateUsd, 0), totalCredits: rows.reduce((a, r) => a + r.credits, 0) };
writeFileSync(path.join(directory, "audit.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
