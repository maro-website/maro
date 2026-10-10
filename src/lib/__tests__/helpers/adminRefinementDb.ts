import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
export const actor = "11111111-1111-4111-8111-111111111111";
export const owner = "22222222-2222-4222-8222-222222222222";
export const other = "33333333-3333-4333-8333-333333333333";
export async function refinementDb() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create schema storage;
    create function auth.role() returns text language sql as $$select current_setting('request.jwt.claim.role',true)$$;
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table auth.users(id uuid primary key);
    create table profiles(id uuid primary key references auth.users on delete cascade,email text,full_name text,credits integer default 0,
      is_creator boolean default false,is_admin boolean default false,access_role text,created_at timestamptz default now(),maro_plan text,plan text,fort_until timestamptz);
    create table commerce_plans(id text primary key,display_name text,enabled boolean default true,workspace_limit integer,renewal_window_days integer default 7);
    create table memberships(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users on delete cascade,plan_id text references commerce_plans,
      started_at timestamptz,expires_at timestamptz,suspended boolean default false,renewal_mode text default 'manual',payment_provider text,
      business_overrides jsonb default '{}',updated_at timestamptz default now());
    create table workspaces(id text primary key,owner_id uuid references auth.users on delete cascade,name text,brain_profile jsonb default '{}',brand_name text,brand_logo_url text,icon_url text);
    create table workspace_sources(id text primary key,workspace_id text references workspaces on delete cascade,owner_id uuid,file_url text);
    create table public_creations(id uuid primary key default gen_random_uuid(),slug text,user_id uuid references auth.users on delete set null);
    create table storage.objects(bucket_id text,name text,metadata jsonb,user_metadata jsonb,owner_id text,primary key(bucket_id,name));
    create table audit_events(id uuid primary key default gen_random_uuid(),actor_id uuid references auth.users on delete set null,action text,target_type text,target_id text,
      before_state jsonb,after_state jsonb,metadata jsonb default '{}',created_at timestamptz default now());
    create table credit_orders(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users on delete set null,
      provider text,status text,currency text default 'EUR',amount_cents integer default 900,paid_at timestamptz,created_at timestamptz default now(),commercial_snapshot jsonb default '{}');
    create table credit_transactions(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,
      type text,amount integer,balance_after integer,metadata jsonb default '{}');
    create table raiaccept_checkouts(order_id uuid primary key references credit_orders,user_id uuid not null references auth.users,
      expected_membership_id uuid references memberships,holds_membership boolean default false,creation_state text default 'created',
      environment text default 'production',payment_state text default 'paid',fulfillment_state text default 'fulfilled');
    create table user_notifications(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users on delete cascade,dedupe_key text,
      kind text,title text,body text,action_href text,metadata jsonb,unique(user_id,dedupe_key));
    alter table user_notifications enable row level security;
    create policy notification_owner on user_notifications for select using(user_id=auth.uid());
    grant usage on schema public,auth to anon,authenticated,service_role;
    grant select on user_notifications to authenticated;
    create table generation_jobs(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users on delete cascade,module text,status text,
      created_at timestamptz default now(),finished_at timestamptz,credits_charged integer default 0,provider_cost_usd numeric);
    create table generations(id uuid primary key default gen_random_uuid(),tool_id text);
    create table reports(status text);
    set request.jwt.claim.role='service_role';
    insert into auth.users values('${actor}'),('${owner}'),('${other}');
    insert into profiles(id,email,full_name,credits,access_role) values('${actor}','admin@example.invalid','Admin',100,'administrator'),('${owner}','owner@example.invalid','Owner',25,null),('${other}','other@example.invalid','Other',10,null);
    insert into commerce_plans(id,display_name,workspace_limit) values('standard','Standard',2),('pro','Pro',5),('business','Business',20);
    insert into workspaces(id,owner_id,name) values('workspace','${owner}','Owner workspace');`);
  await db.exec(readFileSync("supabase/migrations/0050_brain_retention_account_storage.sql", "utf8"));
  await db.exec(readFileSync("supabase/migrations/0052_admin_manual_plan.sql", "utf8"));
  await db.exec(readFileSync("supabase/migrations/0061_admin_user_management.sql", "utf8"));
  await db.exec(readFileSync("supabase/migrations/0062_admin_analytics.sql", "utf8"));
  return db;
}
