// Ordinary regression must never inherit production access or load .env.local.
// Mutating integration tests require an explicitly supplied disposable loopback DB.
const localIntegration = process.env.VITEST_LOCAL_INTEGRATION === "true";
if (localIntegration) {
  let local = false;
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    local = ["http:", "https:"].includes(url.protocol) &&
      ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) &&
      !url.username && !url.password;
  } catch { /* Missing or invalid URL fails closed below. */ }
  if (!local || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    throw new Error("Local integration requires an explicit loopback Supabase URL and test service key");
  }
} else {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "";
}

// Provider/email calls are never part of the regression contract.
for (const name of ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "ANTHROPIC_CHAT_API_KEY", "ELEVENLABS_API_KEY", "RESEND_API_KEY", "CRON_SECRET", "SUPABASE_AUTH_HOOK_SECRET", "TURNSTILE_SECRET_KEY", "PADDLE_SANDBOX_API_KEY", "PADDLE_LIVE_API_KEY", "PADDLE_WEBHOOK_SECRET", "PADDLE_PRODUCTION_DB_PASSWORD", "PADDLE_TEST_DATABASE_URL", "DATABASE_URL", "RAIACCEPT_API_USERNAME", "RAIACCEPT_API_PASSWORD"]) {
  process.env[name] = "";
}

// Defense in depth: ordinary SDK/fetch traffic must be mocked or use loopback.
// This guard never loads credentials; explicit test doubles can replace fetch.
const isolatedFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) {
    return Promise.reject(new Error("Regression network blocked: use an explicit mock"));
  }
  return isolatedFetch(input, init);
};
