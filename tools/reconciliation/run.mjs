import { pathToFileURL } from "node:url";

const ENDPOINT = "/api/cron/reconcile-stale-jobs";
const MAX_RESPONSE_BYTES = 4096;

function configuration(env) {
  const secret = env.CRON_SECRET?.trim();
  if (!secret) throw new Error("missing_cron_secret");
  if (!env.APP_ORIGIN?.trim()) throw new Error("missing_app_origin");
  let origin;
  try { origin = new URL(env.APP_ORIGIN.trim()); }
  catch { throw new Error("invalid_app_origin"); }
  const localTest = ["test", "development"].includes(env.NODE_ENV) &&
    ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
  if ((origin.protocol !== "https:" && !(localTest && origin.protocol === "http:")) ||
      origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/") {
    throw new Error("invalid_app_origin");
  }
  const timeoutMs = Number(env.RECONCILE_TIMEOUT_MS ?? 60000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 120000) {
    throw new Error("invalid_timeout");
  }
  return { url: new URL(ENDPOINT, origin), secret, timeoutMs };
}

async function readAcknowledgement(response) {
  if (!response.headers.get("content-type")?.toLowerCase().includes("application/json")) return false;
  const reader = response.body?.getReader();
  if (!reader) return false;
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) return false;
      chunks.push(Buffer.from(value));
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return body?.ok === true && body?.staleJobsReconciled === true;
  } finally {
    await reader.cancel().catch(() => {});
  }
}

/** Run once. Endpoint and database own reconciliation; never retry here. */
export async function run(env = process.env) {
  const started = Date.now();
  let config;
  try { config = configuration(env); }
  catch (error) {
    // Only fixed, locally authored configuration codes reach this log.
    console.error(JSON.stringify({ event: "reconcile_failed", reason: error.message }));
    return 1;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  let status;
  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.secret}`, Accept: "application/json" },
      redirect: "manual", // Never forward the credential to a redirect target.
      signal: controller.signal,
    });
    status = response.status;
    if (status !== 200) {
      await response.body?.cancel();
      console.error(JSON.stringify({ event: "reconcile_failed", reason: "http_status", status }));
      return 1;
    }
    if (!(await readAcknowledgement(response))) {
      console.error(JSON.stringify({ event: "reconcile_failed", reason: "invalid_acknowledgement", status }));
      return 1;
    }
    console.log(JSON.stringify({ event: "reconcile_succeeded", status, durationMs: Date.now() - started }));
    return 0;
  } catch {
    // Never log URLs, headers, response bodies, exception text or credentials.
    console.error(JSON.stringify({ event: "reconcile_failed", reason: controller.signal.aborted ? "timeout" : "request_failed", status }));
    return 1;
  } finally {
    clearTimeout(timer);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await run();
}
