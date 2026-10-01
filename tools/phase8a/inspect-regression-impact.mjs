// Read-only incident assessment. Never removes or changes any record.
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";

async function inspect() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(30000) }) },
  });
  const start = "2026-09-17T14:20:00Z";
  const end = "2026-09-17T14:20:40Z";
  let remainingTestUsers = 0;
  let usersFullyChecked = false;
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) break;
    remainingTestUsers += data.users.filter(u => u.email?.startsWith("commerce-smoke-") && u.email.endsWith("@maro.test") && u.created_at >= start && u.created_at <= end).length;
    if (data.users.length < 1000) { usersFullyChecked = true; break; }
  }
  const queries = {
    testOrders: db.from("credit_orders").select("id,status,user_id,provider").like("user_email", "commerce-smoke-%@maro.test").gte("created_at", start).lte("created_at", end),
    notifications: db.from("user_notifications").select("id,kind,user_id,dedupe_key").gte("created_at", start).lte("created_at", end),
    membershipsUpdated: db.from("memberships").select("id,persisted_status,user_id").gte("updated_at", start).lte("updated_at", end),
    emailLogs: db.from("email_logs").select("id,status,error_category,recipient_user_id").gte("created_at", start).lte("created_at", end),
    emailOutbox: db.from("email_outbox").select("id,status").gte("created_at", start).lte("created_at", end),
    creditTransactions: db.from("credit_transactions").select("id,type").gte("created_at", start).lte("created_at", end),
    generationJobs: db.from("generation_jobs").select("id,status").gte("created_at", start).lte("created_at", end),
  };
  const tables = {};
  for (const [name, query] of Object.entries(queries)) {
    const { data, error } = await query.limit(1000);
    tables[name] = { ok: !error, count: error ? null : data.length,
      ...(error ? { code: /^[A-Z0-9]{3,10}$/.test(error.code ?? "") ? error.code : "read_failed" } : {}),
      ...(name === "emailLogs" && data ? { statuses: data.map(r => ({ status: r.status, errorCategory: r.error_category, recipientStillLinked: Boolean(r.recipient_user_id) })) } : {}),
      ...(name === "testOrders" && data ? { records: data.map(r => ({ id: r.id, status: r.status, provider: r.provider, userStillLinked: Boolean(r.user_id) })) } : {}),
      ...(["notifications", "membershipsUpdated"].includes(name) && data ? { records: data.map(r => ({ id: r.id, kind: r.kind, status: r.persisted_status, renewalNotification: r.dedupe_key?.startsWith("plan_expiry:"), acceptedInternalAccount: r.user_id === "fec01baa-8451-4112-84fb-8552f8b31686" })) } : {}),
    };
  }
  const profile = await db.from("profiles").select("credits,credits_reserved").eq("id", "fec01baa-8451-4112-84fb-8552f8b31686").single();
  const result = { checkedAt: new Date().toISOString(), window: { start, end }, usersFullyChecked, remainingTestUsers, tables,
    acceptedInternalBalance: profile.error ? null : profile.data,
    assessmentMutations: 0 };
  mkdirSync("scripts/phase8a-data", { recursive: true });
  writeFileSync("scripts/phase8a-data/regression-impact.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}
inspect().catch(() => { console.error("regression_impact_read_failed"); process.exitCode = 1; });
