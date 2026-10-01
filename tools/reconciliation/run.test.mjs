import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const runner = fileURLToPath(new URL("./run.mjs", import.meta.url));
const SECRET = "fake-local-secret-never-print";
const acknowledgement = JSON.stringify({ ok: true, staleJobsReconciled: true });

async function endpoint(t, handler) {
  const requests = [];
  const server = createServer((req, res) => {
    requests.push({ method: req.method, url: req.url, auth: req.headers.authorization });
    handler(req, res);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  return { origin: `http://127.0.0.1:${server.address().port}`, requests };
}

function execute(env = {}) {
  return new Promise((resolve, reject) => {
    // Deliberately do not inherit application/provider/production credentials.
    const child = spawn(process.execPath, [runner], {
      env: { NODE_ENV: "test", CRON_SECRET: SECRET, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", chunk => { output += chunk; });
    child.stderr.on("data", chunk => { output += chunk; });
    const timeout = setTimeout(() => { child.kill(); reject(new Error("runner_did_not_exit")); }, 5000);
    child.on("error", error => { clearTimeout(timeout); reject(error); });
    child.on("close", code => {
      clearTimeout(timeout);
      assert.equal(output.includes(SECRET), false, "secret leaked");
      resolve({ code, output });
    });
  });
}

test("missing secret fails before any request", async t => {
  const service = await endpoint(t, () => assert.fail("unexpected request"));
  const result = await execute({ APP_ORIGIN: service.origin, CRON_SECRET: "" });
  assert.equal(result.code, 1);
  assert.match(result.output, /missing_cron_secret/);
  assert.equal(service.requests.length, 0);
});

test("missing explicit origin fails even when an alias exists", async () => {
  const result = await execute({ NEXT_PUBLIC_APP_URL: "http://127.0.0.1:1" });
  assert.equal(result.code, 1);
  assert.match(result.output, /missing_app_origin/);
});

test("verified success sends one authenticated POST and exits zero", async t => {
  const service = await endpoint(t, (_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(acknowledgement);
  });
  const result = await execute({ APP_ORIGIN: `${service.origin}/` });
  assert.equal(result.code, 0);
  assert.match(result.output, /reconcile_succeeded/);
  assert.deepEqual(service.requests, [{ method: "POST", url: "/api/cron/reconcile-stale-jobs", auth: `Bearer ${SECRET}` }]);
});

for (const status of [401, 403, 500, 503]) {
  test(`HTTP ${status} fails without printing response or retrying`, async t => {
    const service = await endpoint(t, (_req, res) => { res.writeHead(status); res.end(SECRET); });
    const result = await execute({ APP_ORIGIN: service.origin });
    assert.equal(result.code, 1);
    assert.match(result.output, /http_status/);
    assert.equal(service.requests.length, 1);
  });
}

test("redirects are not followed", async t => {
  const destination = await endpoint(t, () => assert.fail("redirect followed"));
  const service = await endpoint(t, (_req, res) => { res.writeHead(307, { Location: destination.origin }); res.end(); });
  const result = await execute({ APP_ORIGIN: service.origin });
  assert.equal(result.code, 1);
  assert.equal(destination.requests.length, 0);
});

for (const [label, body, type] of [
  ["HTML", SECRET, "text/html"],
  ["malformed JSON", SECRET, "application/json"],
  ["false acknowledgement", '{"ok":true,"staleJobsReconciled":false}', "application/json"],
  ["missing acknowledgement", '{"ok":true}', "application/json"],
  ["oversized body", JSON.stringify({ ok: true, staleJobsReconciled: true, extra: "x".repeat(5000) }), "application/json"],
]) {
  test(`200 with ${label} fails`, async t => {
    const service = await endpoint(t, (_req, res) => { res.writeHead(200, { "Content-Type": type }); res.end(body); });
    const result = await execute({ APP_ORIGIN: service.origin });
    assert.equal(result.code, 1);
  });
}

for (const stage of ["headers", "body"]) {
  test(`timeout while waiting for ${stage} exits non-zero`, async t => {
    const service = await endpoint(t, (_req, res) => {
      if (stage === "body") { res.writeHead(200, { "Content-Type": "application/json" }); res.write('{"ok":'); }
    });
    const result = await execute({ APP_ORIGIN: service.origin, RECONCILE_TIMEOUT_MS: "100" });
    assert.equal(result.code, 1);
    assert.match(result.output, /timeout/);
  });
}

for (const origin of ["invalid", "http://maro.invalid", "https://user:password@maro.invalid", "https://maro.invalid/path", "https://maro.invalid/?secret=bad", "https://maro.invalid/#bad"]) {
  test(`invalid origin is rejected: ${origin}`, async () => {
    const result = await execute({ APP_ORIGIN: origin });
    assert.equal(result.code, 1);
    assert.match(result.output, /invalid_app_origin/);
    assert.deepEqual(JSON.parse(result.output), { event: "reconcile_failed", reason: "invalid_app_origin" });
  });
}

test("production rejects HTTP even on loopback", async () => {
  const result = await execute({ NODE_ENV: "production", APP_ORIGIN: "http://127.0.0.1:1" });
  assert.equal(result.code, 1);
  assert.match(result.output, /invalid_app_origin/);
});

for (const timeout of ["0", "120001", "invalid"]) {
  test(`invalid timeout ${timeout} fails closed`, async () => {
    const result = await execute({ APP_ORIGIN: "http://127.0.0.1:1", RECONCILE_TIMEOUT_MS: timeout });
    assert.equal(result.code, 1);
    assert.match(result.output, /invalid_timeout/);
  });
}

test("network failure exits non-zero without exception details", async () => {
  const result = await execute({ APP_ORIGIN: "http://127.0.0.1:1" });
  assert.equal(result.code, 1);
  assert.match(result.output, /request_failed/);
  assert.equal(result.output.includes("127.0.0.1"), false);
});
