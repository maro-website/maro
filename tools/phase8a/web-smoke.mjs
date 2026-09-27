import assert from "node:assert/strict";
import { createServer } from "node:net";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const probe = createServer();
await new Promise(resolve => probe.listen(0, "127.0.0.1", resolve));
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const env = { ...process.env, PORT: String(port), HOSTNAME: "unresolvable-container-name.invalid", NODE_ENV: "production", NEXT_PUBLIC_SIGNUP_ENABLED: "false", PUBLIC_LAUNCH_MODE: "live" };
for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "ANTHROPIC_CHAT_API_KEY", "ELEVENLABS_API_KEY", "RESEND_API_KEY", "CRON_SECRET", "TURNSTILE_SECRET_KEY", "SUPABASE_AUTH_HOOK_SECRET"]) env[name] = "";
const child = spawn(process.execPath, ["start.mjs"], { env, stdio: "ignore", windowsHide: true, detached: process.platform !== "win32" });
child.on("error", () => {});
const results = [];
try {
  const origin = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const response = await fetch(origin, { signal: AbortSignal.timeout(1000) });
      await response.body?.cancel();
      if (response.status === 200) { ready = true; break; }
    } catch { /* Only the local application is probed. */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.equal(ready, true, "start.mjs must serve Railway PORT despite inherited HOSTNAME");
  results.push("web starts on Railway PORT with all-interface binding; health / is 200");
  const signup = await fetch(`${origin}/api/auth/signup`, { method: "POST" });
  assert.equal(signup.status, 403);
  assert.equal((await signup.json()).error, "signup_disabled");
  results.push("public signup remains disabled");
  const cron = await fetch(`${origin}/api/cron/reconcile-stale-jobs`, { method: "POST" });
  assert.equal(cron.status, 503);
  await cron.body?.cancel();
  results.push("unconfigured cron fails closed without database access");
  mkdirSync("scripts/phase8a-data", { recursive: true });
  writeFileSync("scripts/phase8a-data/web-smoke.json", JSON.stringify({ passed: results, count: results.length, productionRequests: 0 }, null, 2));
  console.log(JSON.stringify({ passed: results, count: results.length }));
} catch {
  console.error("phase8a_local_web_smoke_failed");
  process.exitCode = 1;
} finally {
  if (child.pid) {
    if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    else { try { process.kill(-child.pid, "SIGTERM"); } catch {} }
  }
}
