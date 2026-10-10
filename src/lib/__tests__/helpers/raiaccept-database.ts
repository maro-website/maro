import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

/** Disposable PostgreSQL WASM only. Production credentials/data are never loaded. */
export async function createRaiAcceptTestDatabase(options: {fulfillment?:boolean;receipts?:boolean} = {}) {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key, email text);
    create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
    create function auth.role() returns text language sql as $$ select current_setting('request.jwt.claim.role',true) $$;
    create function public.has_admin_access() returns boolean language sql as $$ select false $$;
    create table profiles(id uuid primary key references auth.users(id), credits integer not null default 0, maro_plan text);
    create table credit_orders(id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id),
      user_email text, credits integer not null default 0, amount_cents integer not null default 0,
      currency text not null default 'EUR', status text not null default 'pending', provider text, provider_order_id text,
      item_type text, item_id text, billing_snapshot jsonb, promo_code text, paid_at timestamptz, cancel_reason text,
      created_at timestamptz not null default now());
    create table credit_transactions(id uuid primary key default gen_random_uuid(), user_id uuid,
      type text, amount integer, balance_after integer, idempotency_key text, metadata jsonb,
      unique(user_id,idempotency_key,type));
    set request.jwt.claim.role='service_role';
  `);
  const cancel = readFileSync("supabase/migrations/0014_payments_maro_plan.sql", "utf8")
    .match(/create or replace function public\.cancel_credit_order\([\s\S]*?\$\$;/)?.[0];
  if (!cancel) throw new Error("Missing legacy cancel fixture");
  await db.exec(cancel);
  for (const file of ["0037_commerce_memberships.sql", "0038_commerce_ledger_and_fulfillment.sql", "0040_commerce_rpc_privileges.sql"]) {
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  }
  await db.exec(readFileSync("docs/db-history/current-main/0047_paddle_billing.sql", "utf8"));
  await db.exec(readFileSync("supabase/migrations/0054_raiaccept_checkout_intents.sql", "utf8"));
  if (options.fulfillment||options.receipts) {
    try {await db.exec(readFileSync("supabase/migrations/0055_raiaccept_verified_fulfillment.sql", "utf8"));}
    catch(error) {
      const diagnostic=error as {message?:string;where?:string;internalPosition?:string;internalQuery?:string;position?:string};
      throw new Error(JSON.stringify({message:diagnostic.message,where:diagnostic.where,position:diagnostic.position,
        internalPosition:diagnostic.internalPosition,internalQuery:diagnostic.internalQuery}));
    }
  }
  if (options.receipts) await db.exec(readFileSync("supabase/migrations/0056_raiaccept_receipt_delivery.sql","utf8"));
  if (options.fulfillment || options.receipts) await db.exec(readFileSync("supabase/migrations/0063_current_membership_ordering.sql", "utf8"));
  return db;
}
