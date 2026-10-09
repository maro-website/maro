-- Captured public schema, 9 October 2026. No customer data or credentials.
-- EMPTY Supabase scratch project only. Never apply this baseline over production.
-- Supabase-managed auth/storage/extensions must already exist.
begin;
set local check_function_bodies = false;
do $$ begin if to_regclass('public.profiles') is not null then raise exception 'baseline_requires_empty_public_schema'; end if; end $$;
create sequence rate_limit_events_id_seq;
create table public."abuse_events" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid,
  "ip" text,
  "event_type" text not null,
  "severity" text default 'info'::text not null,
  "metadata" jsonb default '{}'::jsonb,
  "created_at" timestamp with time zone default now() not null
);
create table public."app_settings" (
  "id" integer default 1 not null,
  "master_prompt" text default ''::text not null,
  "pricing" jsonb default '{}'::jsonb not null,
  "updated_at" timestamp with time zone default now() not null,
  "tool_prompts" jsonb default '{}'::jsonb not null,
  "fort_config" jsonb default '{}'::jsonb not null,
  "tool_option_icons" jsonb default '{}'::jsonb not null,
  "platform_limits" jsonb default '{"warnPct": 80, "aiPaused": false, "maxQueueSize": 200, "userDailyUsd": 50, "dailySpendUsd": 500, "pausedModules": [], "userHourlyUsd": 10, "hourlySpendUsd": 100, "promptMaxChars": 4000, "maxConcurrentFort": 3, "maxConcurrentFree": 1, "maxActiveJobsGlobal": 50}'::jsonb not null,
  "ai_paused" boolean default false not null,
  "logo_wizard_content" jsonb
);
create table public."audit_events" (
  "id" uuid default gen_random_uuid() not null,
  "actor_id" uuid,
  "action" text not null,
  "target_type" text,
  "target_id" text,
  "before_state" jsonb,
  "after_state" jsonb,
  "request_id" text,
  "metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."brain_retention_files" (
  "path" text not null,
  "queued_at" timestamp with time zone default now() not null
);
create table public."budget_guards" (
  "id" uuid default gen_random_uuid() not null,
  "scope" text not null,
  "scope_key" text,
  "daily_limit_usd" numeric(12,2),
  "monthly_limit_usd" numeric(12,2),
  "enabled" boolean default false not null,
  "metadata" jsonb default '{}'::jsonb not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."business_leads" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid,
  "email" text,
  "status" text default 'inquiry'::text not null,
  "questionnaire" jsonb default '{}'::jsonb not null,
  "admin_notes" text default ''::text not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."challenge_entries" (
  "id" uuid default gen_random_uuid() not null,
  "challenge_id" uuid not null,
  "user_id" uuid not null,
  "creation_id" uuid,
  "score" integer default 0 not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."commerce_plans" (
  "id" text not null,
  "enabled" boolean default true not null,
  "display_name" text not null,
  "description" text default ''::text not null,
  "price_cents" integer default 0 not null,
  "currency" text default 'EUR'::text not null,
  "included_credits" integer default 0 not null,
  "duration_days" integer default 30 not null,
  "workspace_limit" integer default 1 not null,
  "concurrency_limit" integer default 1 not null,
  "renewal_window_days" integer default 7 not null,
  "renewal_mode" text default 'manual'::text not null,
  "recommended_badge" text,
  "sort_order" integer default 0 not null,
  "contact_only" boolean default false not null,
  "metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."commerce_topups" (
  "id" text not null,
  "credits" integer not null,
  "price_cents" integer not null,
  "currency" text default 'EUR'::text not null,
  "enabled" boolean default true not null,
  "sort_order" integer default 0 not null,
  "requires_active_plan" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."contest_submissions" (
  "id" uuid default gen_random_uuid() not null,
  "contest_id" uuid not null,
  "user_id" uuid not null,
  "creation_id" uuid,
  "url" text not null,
  "prompt" text default ''::text not null,
  "author" text,
  "winner" boolean default false not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."contests" (
  "id" uuid default gen_random_uuid() not null,
  "slug" text not null,
  "title" text not null,
  "description" text default ''::text not null,
  "prize_label" text default ''::text not null,
  "prize_credits" integer default 0 not null,
  "cover_url" text,
  "status" text default 'open'::text not null,
  "starts_at" timestamp with time zone default now() not null,
  "ends_at" timestamp with time zone not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."creation_likes" (
  "user_id" uuid not null,
  "creation_id" uuid not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."creation_saves" (
  "user_id" uuid not null,
  "creation_id" uuid not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."creation_views" (
  "creation_id" uuid not null,
  "visitor_hash" text not null,
  "viewed_on" date default CURRENT_DATE not null
);
create table public."creator_applications" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "email" text not null,
  "instagram" text,
  "tiktok" text,
  "facebook" text,
  "youtube" text,
  "website" text,
  "status" text default 'pending'::text not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."creator_commissions" (
  "id" uuid default gen_random_uuid() not null,
  "creator_id" uuid not null,
  "order_id" uuid,
  "promo_code" text,
  "gross_amount" numeric(12,2),
  "commission_amount" numeric(12,2),
  "currency" text default 'ALL'::text not null,
  "status" text default 'pending'::text not null,
  "metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null,
  "paid_at" timestamp with time zone,
  "paid_by" uuid,
  "payment_reference" text,
  "reversed_at" timestamp with time zone,
  "reversed_by" uuid
);
create table public."creator_follows" (
  "follower_id" uuid not null,
  "creator_id" uuid not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."credit_orders" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid,
  "user_email" text,
  "credits" integer default 0 not null,
  "amount_cents" integer default 0 not null,
  "currency" text default 'EUR'::text not null,
  "status" text default 'pending'::text not null,
  "provider" text,
  "created_at" timestamp with time zone default now() not null,
  "promo_code" text,
  "item_type" text,
  "item_id" text,
  "billing_snapshot" jsonb default '{}'::jsonb,
  "paid_at" timestamp with time zone,
  "provider_order_id" text,
  "cancel_reason" text,
  "order_kind" text,
  "membership_id" uuid,
  "commercial_snapshot" jsonb default '{}'::jsonb not null,
  "provider_transaction_id" text,
  "paddle_customer_id" text,
  "paddle_subscription_id" text,
  "paddle_price_id" text,
  "paddle_period_start" timestamp with time zone,
  "paddle_period_end" timestamp with time zone
);
create table public."credit_transactions" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "job_id" uuid,
  "type" text not null,
  "amount" integer not null,
  "balance_after" integer,
  "idempotency_key" text,
  "metadata" jsonb default '{}'::jsonb,
  "created_at" timestamp with time zone default now() not null,
  "order_id" uuid,
  "membership_id" uuid,
  "reason" text
);
create table public."data_retention_policies" (
  "domain" text not null,
  "retention_days" integer not null,
  "description" text default ''::text not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."email_logs" (
  "id" uuid default gen_random_uuid() not null,
  "outbox_id" uuid,
  "template_key" text not null,
  "recipient_user_id" uuid,
  "recipient_domain" text,
  "provider" text default 'resend'::text not null,
  "provider_message_id" text,
  "status" text default 'sent'::text not null,
  "error_category" text,
  "metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."email_outbox" (
  "id" uuid default gen_random_uuid() not null,
  "template_key" text not null,
  "locale" text default 'sq'::text not null,
  "recipient_email" text not null,
  "recipient_user_id" uuid,
  "payload" jsonb default '{}'::jsonb not null,
  "idempotency_key" text not null,
  "status" text default 'queued'::text not null,
  "attempts" integer default 0 not null,
  "last_error" text,
  "provider_message_id" text,
  "scheduled_at" timestamp with time zone default now() not null,
  "sent_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null
);
create table public."email_settings" (
  "id" text default 'default'::text not null,
  "from_name" text default 'maro'::text not null,
  "from_email" text default 'info@maro.al'::text not null,
  "reply_to" text default 'info@maro.al'::text not null,
  "provider" text default 'resend'::text not null,
  "product_email_enabled" boolean default true not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."email_template_versions" (
  "id" uuid default gen_random_uuid() not null,
  "template_id" uuid not null,
  "version_label" text not null,
  "status" text default 'draft'::text not null,
  "subject" text not null,
  "preview_text" text default ''::text not null,
  "content" jsonb default '{}'::jsonb not null,
  "allowed_variables" text[] default '{}'::text[] not null,
  "change_note" text default ''::text not null,
  "created_by" uuid,
  "published_by" uuid,
  "created_at" timestamp with time zone default now() not null,
  "published_at" timestamp with time zone
);
create table public."email_templates" (
  "id" uuid default gen_random_uuid() not null,
  "template_key" text not null,
  "name" text not null,
  "category" text not null,
  "locale" text default 'sq'::text not null,
  "enabled" boolean default true not null,
  "is_system" boolean default false not null,
  "live_version_id" uuid,
  "metadata" jsonb default '{}'::jsonb not null,
  "created_by" uuid,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."engine_internal_canary_users" (
  "user_id" uuid not null,
  "enabled" boolean default true not null,
  "note" text,
  "created_at" timestamp with time zone default now() not null,
  "created_by" uuid
);
create table public."engine_shadow_comparisons" (
  "id" uuid default gen_random_uuid() not null,
  "generation_id" uuid,
  "job_id" uuid,
  "tool_id" text not null,
  "registry_tool_id" text not null,
  "model_id" text not null,
  "user_id" uuid,
  "workspace_id" text,
  "production_pipeline" text default 'shadow'::text not null,
  "legacy_snapshot" jsonb default '{}'::jsonb not null,
  "engine_snapshot" jsonb default '{}'::jsonb not null,
  "structural_diff" jsonb default '{}'::jsonb not null,
  "warnings" jsonb default '[]'::jsonb not null,
  "compile_error" text,
  "created_at" timestamp with time zone default now() not null,
  "review_status" text default 'unreviewed'::text not null,
  "review_note" text,
  "reviewed_at" timestamp with time zone,
  "critical_mismatch" boolean default false not null,
  "critical_flags" jsonb default '[]'::jsonb not null,
  "compile_status" text default 'success'::text not null,
  "context_metadata" jsonb default '{}'::jsonb not null
);
create table public."feature_flags" (
  "key" text not null,
  "enabled" boolean default false not null,
  "metadata" jsonb default '{}'::jsonb not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."generation_internal_prompts" (
  "generation_id" uuid not null,
  "compiled_prompt" text not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."generation_jobs" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "module" text not null,
  "model" text,
  "status" text default 'pending'::text not null,
  "idempotency_key" text,
  "credits_reserved" integer default 0 not null,
  "credits_charged" integer default 0 not null,
  "provider_cost_usd" numeric(12,6),
  "input_tokens" integer,
  "output_tokens" integer,
  "retry_count" integer default 0 not null,
  "priority" integer default 0 not null,
  "error" text,
  "metadata" jsonb default '{}'::jsonb,
  "started_at" timestamp with time zone,
  "finished_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null
);
create table public."generations" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid,
  "user_email" text,
  "prompt" text,
  "final_prompt" text,
  "website_type" text,
  "speed" text,
  "model" text,
  "credits_spent" integer default 0 not null,
  "created_at" timestamp with time zone default now() not null,
  "tool_id" text,
  "kind" text,
  "output_urls" text[],
  "reaction" text,
  "selections" jsonb,
  "fort" jsonb,
  "workspace_id" text,
  "thumbnail_path" text,
  "job_id" uuid,
  "conversation_id" uuid,
  "input_refs" text[],
  "logo_wizard" jsonb,
  "favourite" boolean default false not null,
  "title" text,
  "brain" boolean default false not null
);
create table public."help_articles" (
  "id" uuid default gen_random_uuid() not null,
  "slug" text not null,
  "title" text not null,
  "body" text default ''::text not null,
  "category" text default 'general'::text not null,
  "published" boolean default false not null,
  "sort_order" integer default 0 not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "archived" boolean default false not null
);
create table public."launch_waitlist" (
  "id" bigint generated by default as identity not null,
  "email" text not null,
  "source" text default 'coming_soon'::text not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."login_ads" (
  "id" uuid default gen_random_uuid() not null,
  "image_url" text not null,
  "image_path" text not null,
  "external_url" text not null,
  "weight" smallint default 3 not null,
  "active" boolean default true not null,
  "created_by" uuid,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."maro_prompts" (
  "id" uuid default gen_random_uuid() not null,
  "code" text not null,
  "category" text default ''::text not null,
  "featured_url" text,
  "full_prompt" text default ''::text not null,
  "keywords" text[] default '{}'::text[] not null,
  "target_tool" text default 'logo'::text not null,
  "active" boolean default true not null,
  "reveal_count" integer default 0 not null,
  "use_count" integer default 0 not null,
  "created_at" timestamp with time zone default now() not null,
  "preset_category" text,
  "default_selections" jsonb,
  "marketing" boolean default false not null,
  "category_id" uuid,
  "tool" text default 'imazh'::text not null,
  "title" text not null,
  "slug" text not null,
  "description" text default ''::text not null,
  "config" jsonb default '{"version": 1}'::jsonb not null,
  "status" text default 'published'::text not null,
  "featured" boolean default false not null,
  "sort_order" integer default 0 not null,
  "access_level" text default 'free'::text not null,
  "search_text" text default ''::text not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."memberships" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "plan_id" text not null,
  "started_at" timestamp with time zone default now() not null,
  "expires_at" timestamp with time zone not null,
  "renewal_mode" text default 'manual'::text not null,
  "renewed_from_id" uuid,
  "cycle_renewal_fulfilled_at" timestamp with time zone,
  "business_overrides" jsonb default '{}'::jsonb not null,
  "suspended" boolean default false not null,
  "persisted_status" text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "payment_provider" text,
  "paddle_subscription_id" text,
  "paddle_customer_id" text,
  "paddle_price_id" text,
  "paddle_origin_order_id" uuid,
  "paddle_status" text,
  "paddle_event_at" timestamp with time zone,
  "paddle_scheduled_change" jsonb,
  "paddle_paid_through" timestamp with time zone
);
create table public."notification_campaigns" (
  "id" uuid default gen_random_uuid() not null,
  "kind" text not null,
  "title" text not null,
  "body" text default ''::text not null,
  "cta_label" text,
  "cta_url" text,
  "tool_id" text,
  "audience" text default 'all'::text not null,
  "priority" integer default 0 not null,
  "dismissible" boolean default true not null,
  "active" boolean default false not null,
  "starts_at" timestamp with time zone,
  "ends_at" timestamp with time zone,
  "metadata" jsonb default '{}'::jsonb not null,
  "created_by" uuid,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "target_modules" text[] default ARRAY['all'::text] not null,
  "archived_at" timestamp with time zone
);
create table public."notification_dismissals" (
  "user_id" uuid not null,
  "campaign_id" uuid not null,
  "dismissed_at" timestamp with time zone default now() not null
);
create table public."paddle_webhook_events" (
  "event_id" text not null,
  "event_type" text not null,
  "occurred_at" timestamp with time zone not null,
  "processed_at" timestamp with time zone default now() not null
);
create table public."platform_spend_rollup" (
  "bucket_start" timestamp with time zone not null,
  "bucket_type" text not null,
  "user_id" uuid default '00000000-0000-0000-0000-000000000000'::uuid not null,
  "module" text default ''::text not null,
  "spend_usd" numeric(12,6) default 0 not null,
  "credits_charged" integer default 0 not null,
  "job_count" integer default 0 not null
);
create table public."preset_categories" (
  "id" uuid default gen_random_uuid() not null,
  "slug" text not null,
  "label" text not null,
  "description" text default ''::text not null,
  "sort_order" integer default 0 not null,
  "active" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "tool" text default 'imazh'::text not null
);
create table public."pricing_snapshots" (
  "id" uuid default gen_random_uuid() not null,
  "order_id" uuid,
  "snapshot" jsonb not null,
  "created_at" timestamp with time zone default now() not null,
  "kind" text default 'purchase'::text not null,
  "generation_id" uuid,
  "job_id" uuid,
  "user_id" uuid
);
create table public."product_events" (
  "id" uuid default gen_random_uuid() not null,
  "event_name" text not null,
  "user_id" uuid,
  "tool_id" text,
  "metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."profiles" (
  "id" uuid not null,
  "email" text,
  "full_name" text,
  "credits" integer default 0 not null,
  "is_admin" boolean default false not null,
  "created_at" timestamp with time zone default now() not null,
  "is_creator" boolean default false not null,
  "plan" text default 'free'::text not null,
  "fort_until" timestamp with time zone,
  "credits_reserved" integer default 0 not null,
  "email_verified_at" timestamp with time zone,
  "risk_score" integer default 0 not null,
  "generation_paused" boolean default false not null,
  "device_fingerprint_hash" text,
  "maro_plan" text,
  "active_workspace_id" text,
  "access_role" text,
  "username" text default ('maro_'::text || "left"(replace((gen_random_uuid())::text, '-'::text, ''::text), 24)),
  "avatar_url" text
);
create table public."promo_codes" (
  "id" uuid default gen_random_uuid() not null,
  "code" text not null,
  "slug" text,
  "discount_percent" integer default 10 not null,
  "active" boolean default true not null,
  "creator_id" uuid,
  "created_at" timestamp with time zone default now() not null
);
create table public."promo_events" (
  "id" uuid default gen_random_uuid() not null,
  "code" text not null,
  "kind" text not null,
  "user_id" uuid,
  "created_at" timestamp with time zone default now() not null
);
create table public."prompt_events" (
  "id" uuid default gen_random_uuid() not null,
  "kind" text not null,
  "tool_id" text,
  "prompt" text default ''::text not null,
  "url" text,
  "user_id" uuid,
  "created_at" timestamp with time zone default now() not null
);
create table public."prompt_layers" (
  "id" uuid default gen_random_uuid() not null,
  "layer_key" text not null,
  "tool_id" text not null,
  "name" text not null,
  "enabled" boolean default true not null,
  "priority" integer default 0 not null,
  "conditions" jsonb default '[]'::jsonb not null,
  "instructions" text default ''::text not null,
  "version_label" text default '1'::text not null,
  "status" text default 'draft'::text not null,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."prompt_likes" (
  "user_id" uuid not null,
  "prompt_id" uuid not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."prompt_reveals" (
  "user_id" uuid not null,
  "prompt_id" uuid not null,
  "credits_spent" integer default 0 not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."provider_cost_estimates" (
  "id" uuid default gen_random_uuid() not null,
  "generation_id" uuid,
  "job_id" uuid,
  "tool_id" text,
  "model_id" text not null,
  "provider" text not null,
  "estimated_cost_usd" numeric(12,6),
  "input_tokens" integer,
  "output_tokens" integer,
  "metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null,
  "cost_source" text default 'usage_calculated'::text not null,
  "reconciliation_status" text default 'estimated'::text not null
);
create table public."public_creations" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid,
  "tool_id" text not null,
  "prompt" text default ''::text not null,
  "url" text not null,
  "author" text,
  "created_at" timestamp with time zone default now() not null,
  "slug" text,
  "remix_of" uuid,
  "like_count" integer default 0 not null,
  "remix_count" integer default 0 not null,
  "featured" boolean default false not null,
  "selections" jsonb,
  "preset_id" uuid,
  "show_prompt" boolean default false not null,
  "show_settings" boolean default false not null,
  "save_count" integer default 0 not null,
  "view_count" integer default 0 not null,
  "deleted_at" timestamp with time zone,
  "updated_at" timestamp with time zone default now() not null
);
create table public."raiaccept_checkouts" (
  "order_id" uuid not null,
  "user_id" uuid not null,
  "request_key" uuid not null,
  "requested_item" text not null,
  "environment" text not null,
  "merchant_account_id" text not null,
  "merchant_reference" text not null,
  "amount_cents" integer not null,
  "currency" text not null,
  "credits" integer not null,
  "commercial_snapshot" jsonb not null,
  "billing_snapshot" jsonb not null,
  "expected_membership_id" uuid,
  "expected_membership_expires_at" timestamp with time zone,
  "holds_membership" boolean default false not null,
  "creation_state" text default 'reserved'::text not null,
  "session_state" text default 'not_started'::text not null,
  "lease_id" uuid,
  "lease_started_at" timestamp with time zone,
  "request_payload" jsonb,
  "provider_order_id" text,
  "session_id" text,
  "redirect_url" text,
  "last_error" text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "payment_state" text default 'unverified'::text not null,
  "fulfillment_state" text default 'pending'::text not null,
  "review_reason" text,
  "verified_order_status" text,
  "last_verified_at" timestamp with time zone,
  "last_verified_summary" jsonb,
  "next_check_at" timestamp with time zone default now(),
  "verification_attempts" integer default 0 not null,
  "verification_lease_id" uuid,
  "verification_lease_started_at" timestamp with time zone,
  "verification_queue_version" bigint
);
create table public."raiaccept_receipt_jobs" (
  "order_id" uuid not null,
  "state" text default 'pending'::text not null,
  "attempts" integer default 0 not null,
  "created_at" timestamp with time zone default now() not null,
  "sent_at" timestamp with time zone,
  "next_attempt_at" timestamp with time zone default now(),
  "last_error" text,
  "lease_id" uuid,
  "lease_started_at" timestamp with time zone,
  "first_attempt_at" timestamp with time zone,
  "request_payload" jsonb,
  "provider_message_id" text
);
create table public."raiaccept_verification_queue" (
  "order_id" uuid not null,
  "candidate_provider_order_id" text not null,
  "version" bigint default 1 not null,
  "processed_version" bigint default 0 not null,
  "last_notified_at" timestamp with time zone default now() not null
);
create table public."raiaccept_verified_payments" (
  "environment" text not null,
  "merchant_account_id" text not null,
  "transaction_id" text not null,
  "order_id" uuid not null,
  "amount_cents" integer not null,
  "currency" text not null,
  "paid_at" timestamp with time zone not null,
  "verified_at" timestamp with time zone default now() not null
);
create table public."rate_limit_events" (
  "id" bigint default nextval('rate_limit_events_id_seq'::regclass) not null,
  "scope" text not null,
  "scope_key" text not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."refund_records" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid,
  "kind" text not null,
  "amount_credits" integer,
  "amount_currency" numeric(12,2),
  "currency" text default 'ALL'::text,
  "status" text default 'pending'::text not null,
  "reason" text not null,
  "generation_id" uuid,
  "order_id" uuid,
  "report_id" uuid,
  "ticket_id" uuid,
  "processed_by" uuid,
  "metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null,
  "processed_at" timestamp with time zone
);
create table public."reports" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid,
  "user_email" text,
  "tool_id" text,
  "kind" text,
  "target_id" text,
  "target_url" text,
  "prompt" text,
  "message" text,
  "credits_spent" integer default 0,
  "status" text default 'open'::text not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."retention_execution_runs" (
  "id" uuid default gen_random_uuid() not null,
  "domain" text not null,
  "status" text not null,
  "rows_affected" integer default 0 not null,
  "error_message" text,
  "metadata" jsonb default '{}'::jsonb not null,
  "started_at" timestamp with time zone default now() not null,
  "finished_at" timestamp with time zone
);
create table public."security_events" (
  "id" uuid default gen_random_uuid() not null,
  "event_type" text not null,
  "severity" text default 'info'::text not null,
  "user_id" uuid,
  "ip_address" text,
  "metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."signup_signals" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "ip" text,
  "user_agent_hash" text,
  "created_at" timestamp with time zone default now() not null
);
create table public."storage_usage" (
  "user_id" uuid not null,
  "bytes_used" bigint default 0 not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."support_ticket_messages" (
  "id" uuid default gen_random_uuid() not null,
  "ticket_id" uuid not null,
  "author_id" uuid,
  "author_role" text default 'user'::text not null,
  "body" text not null,
  "internal" boolean default false not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."support_tickets" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid,
  "user_email" text,
  "subject" text not null,
  "status" text default 'open'::text not null,
  "priority" text default 'normal'::text not null,
  "category" text default 'general'::text not null,
  "generation_id" uuid,
  "order_id" uuid,
  "assigned_to" uuid,
  "metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "resolved_at" timestamp with time zone
);
create table public."system_prompt_versions" (
  "id" uuid default gen_random_uuid() not null,
  "tool_id" text not null,
  "version_label" text not null,
  "status" text default 'draft'::text not null,
  "content" text default ''::text not null,
  "change_note" text default ''::text not null,
  "created_by" uuid,
  "published_by" uuid,
  "created_at" timestamp with time zone default now() not null,
  "published_at" timestamp with time zone
);
create table public."tool_engine_config" (
  "tool_id" text not null,
  "display_name" text not null,
  "registry_tool_id" text not null,
  "route" text default ''::text not null,
  "status" text default 'active'::text not null,
  "production_pipeline" text default 'legacy'::text not null,
  "default_model_id" text,
  "uses_brain" boolean default false not null,
  "uses_fort" boolean default true not null,
  "preset_support" boolean default false not null,
  "brain_mapping" jsonb default '{}'::jsonb not null,
  "metadata" jsonb default '{}'::jsonb not null,
  "updated_at" timestamp with time zone default now() not null,
  "updated_by" uuid
);
create table public."tool_input_fields" (
  "id" uuid default gen_random_uuid() not null,
  "tool_id" text not null,
  "field_key" text not null,
  "label" text not null,
  "description" text default ''::text not null,
  "field_type" text not null,
  "placeholder" text,
  "options" jsonb default '[]'::jsonb not null,
  "default_value" jsonb,
  "required" boolean default false not null,
  "enabled" boolean default true not null,
  "sort_order" integer default 0 not null,
  "standard_visible" boolean default false not null,
  "fort_visible" boolean default true not null,
  "conditional_visibility" jsonb default '[]'::jsonb not null,
  "model_compatibility" jsonb default '[]'::jsonb not null,
  "preset_compatibility" jsonb default '[]'::jsonb not null,
  "cost_modifier" jsonb default '{}'::jsonb not null,
  "metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."tool_model_configs" (
  "id" uuid default gen_random_uuid() not null,
  "tool_id" text not null,
  "model_id" text not null,
  "display_name" text not null,
  "provider" text default 'unknown'::text not null,
  "enabled" boolean default true not null,
  "is_default" boolean default false not null,
  "is_fallback" boolean default false not null,
  "coming_soon" boolean default false not null,
  "sort_order" integer default 0 not null,
  "cost_metadata" jsonb default '{}'::jsonb not null,
  "metadata" jsonb default '{}'::jsonb not null,
  "updated_at" timestamp with time zone default now() not null
);
create table public."user_notifications" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "dedupe_key" text not null,
  "kind" text default 'billing'::text not null,
  "title" text not null,
  "body" text default ''::text not null,
  "action_href" text,
  "read_at" timestamp with time zone,
  "metadata" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."weekly_challenges" (
  "id" uuid default gen_random_uuid() not null,
  "slug" text not null,
  "title" text not null,
  "prompt_hint" text default ''::text not null,
  "tool_id" text default 'reklama'::text not null,
  "reward_credits" integer default 25 not null,
  "starts_at" timestamp with time zone default now() not null,
  "ends_at" timestamp with time zone not null,
  "active" boolean default true not null,
  "created_at" timestamp with time zone default now() not null
);
create table public."workspace_sources" (
  "id" text not null,
  "workspace_id" text not null,
  "owner_id" uuid not null,
  "name" text not null,
  "keywords" text default ''::text not null,
  "file_url" text not null,
  "mime_type" text,
  "created_at" timestamp with time zone default now() not null
);
create table public."workspaces" (
  "id" text not null,
  "owner_id" uuid not null,
  "name" text default 'Maro Workspace #1'::text not null,
  "icon_url" text,
  "sort_order" integer default 0 not null,
  "created_at" timestamp with time zone default now() not null,
  "brand_name" text,
  "brand_logo_url" text,
  "brand_primary_color" text default '#253FDA'::text,
  "brand_secondary_color" text default '#0B0B0B'::text,
  "brand_background_color" text default '#FFFFFF'::text,
  "brand_text_color" text default '#0B0B0B'::text,
  "brain_profile" jsonb default '{}'::jsonb not null,
  "brain_retention_anchor_at" timestamp with time zone default now(),
  "brain_reset_at" timestamp with time zone
);
alter table public."abuse_events" add constraint "abuse_events_pkey" PRIMARY KEY (id);
alter table public."abuse_events" add constraint "abuse_events_severity_check" CHECK ((severity = ANY (ARRAY['info'::text, 'warn'::text, 'critical'::text])));
alter table public."app_settings" add constraint "app_settings_pkey" PRIMARY KEY (id);
alter table public."app_settings" add constraint "app_settings_singleton" CHECK ((id = 1));
alter table public."audit_events" add constraint "audit_events_pkey" PRIMARY KEY (id);
alter table public."brain_retention_files" add constraint "brain_retention_files_pkey" PRIMARY KEY (path);
alter table public."budget_guards" add constraint "budget_guards_pkey" PRIMARY KEY (id);
alter table public."budget_guards" add constraint "budget_guards_scope_check" CHECK ((scope = ANY (ARRAY['global'::text, 'tool'::text, 'provider'::text])));
alter table public."business_leads" add constraint "business_leads_pkey" PRIMARY KEY (id);
alter table public."business_leads" add constraint "business_leads_status_check" CHECK ((status = ANY (ARRAY['inquiry'::text, 'questionnaire_sent'::text, 'reviewing'::text, 'offer_sent'::text, 'active'::text, 'closed'::text])));
alter table public."challenge_entries" add constraint "challenge_entries_challenge_id_user_id_key" UNIQUE (challenge_id, user_id);
alter table public."challenge_entries" add constraint "challenge_entries_pkey" PRIMARY KEY (id);
alter table public."commerce_plans" add constraint "commerce_plans_id_check" CHECK ((id = ANY (ARRAY['standard'::text, 'pro'::text, 'business'::text])));
alter table public."commerce_plans" add constraint "commerce_plans_pkey" PRIMARY KEY (id);
alter table public."commerce_plans" add constraint "commerce_plans_renewal_mode_check" CHECK ((renewal_mode = ANY (ARRAY['manual'::text, 'automatic'::text])));
alter table public."commerce_topups" add constraint "commerce_topups_credits_check" CHECK ((credits > 0));
alter table public."commerce_topups" add constraint "commerce_topups_pkey" PRIMARY KEY (id);
alter table public."commerce_topups" add constraint "commerce_topups_price_cents_check" CHECK ((price_cents > 0));
alter table public."contest_submissions" add constraint "contest_submissions_contest_id_user_id_key" UNIQUE (contest_id, user_id);
alter table public."contest_submissions" add constraint "contest_submissions_pkey" PRIMARY KEY (id);
alter table public."contests" add constraint "contests_pkey" PRIMARY KEY (id);
alter table public."contests" add constraint "contests_slug_key" UNIQUE (slug);
alter table public."creation_likes" add constraint "creation_likes_pkey" PRIMARY KEY (user_id, creation_id);
alter table public."creation_saves" add constraint "creation_saves_pkey" PRIMARY KEY (user_id, creation_id);
alter table public."creation_views" add constraint "creation_views_pkey" PRIMARY KEY (creation_id, visitor_hash, viewed_on);
alter table public."creation_views" add constraint "creation_views_visitor_hash_check" CHECK ((length(visitor_hash) = 64));
alter table public."creator_applications" add constraint "creator_applications_pkey" PRIMARY KEY (id);
alter table public."creator_commissions" add constraint "creator_commissions_pkey" PRIMARY KEY (id);
alter table public."creator_commissions" add constraint "creator_commissions_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'paid'::text, 'void'::text])));
alter table public."creator_follows" add constraint "creator_follows_check" CHECK ((follower_id <> creator_id));
alter table public."creator_follows" add constraint "creator_follows_pkey" PRIMARY KEY (follower_id, creator_id);
alter table public."credit_orders" add constraint "credit_orders_order_kind_check" CHECK (((order_kind IS NULL) OR (order_kind = ANY (ARRAY['plan_purchase'::text, 'plan_renewal'::text, 'plan_upgrade'::text, 'topup'::text, 'business_payment'::text]))));
alter table public."credit_orders" add constraint "credit_orders_pkey" PRIMARY KEY (id);
alter table public."credit_transactions" add constraint "credit_transactions_amount_check" CHECK ((amount >= 0));
alter table public."credit_transactions" add constraint "credit_transactions_pkey" PRIMARY KEY (id);
alter table public."credit_transactions" add constraint "credit_transactions_type_check" CHECK ((type = ANY (ARRAY['reserve'::text, 'charge'::text, 'release'::text, 'refund'::text, 'manual_adjustment'::text, 'plan_purchase'::text, 'plan_renewal'::text, 'plan_upgrade'::text, 'topup'::text, 'admin_grant'::text, 'admin_adjustment'::text])));
alter table public."data_retention_policies" add constraint "data_retention_policies_pkey" PRIMARY KEY (domain);
alter table public."email_logs" add constraint "email_logs_pkey" PRIMARY KEY (id);
alter table public."email_logs" add constraint "email_logs_status_check" CHECK ((status = ANY (ARRAY['sent'::text, 'delivered'::text, 'bounced'::text, 'failed'::text, 'complained'::text])));
alter table public."email_outbox" add constraint "email_outbox_idempotency_key_key" UNIQUE (idempotency_key);
alter table public."email_outbox" add constraint "email_outbox_pkey" PRIMARY KEY (id);
alter table public."email_outbox" add constraint "email_outbox_status_check" CHECK ((status = ANY (ARRAY['queued'::text, 'sending'::text, 'sent'::text, 'failed'::text, 'cancelled'::text])));
alter table public."email_settings" add constraint "email_settings_pkey" PRIMARY KEY (id);
alter table public."email_template_versions" add constraint "email_template_versions_pkey" PRIMARY KEY (id);
alter table public."email_template_versions" add constraint "email_template_versions_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'live'::text, 'archived'::text])));
alter table public."email_template_versions" add constraint "email_template_versions_template_id_version_label_key" UNIQUE (template_id, version_label);
alter table public."email_templates" add constraint "email_templates_category_check" CHECK ((category = ANY (ARRAY['auth'::text, 'account'::text, 'commerce'::text, 'workspace'::text])));
alter table public."email_templates" add constraint "email_templates_pkey" PRIMARY KEY (id);
alter table public."email_templates" add constraint "email_templates_template_key_locale_key" UNIQUE (template_key, locale);
alter table public."engine_internal_canary_users" add constraint "engine_internal_canary_users_pkey" PRIMARY KEY (user_id);
alter table public."engine_shadow_comparisons" add constraint "engine_shadow_comparisons_compile_status_check" CHECK ((compile_status = ANY (ARRAY['success'::text, 'failed'::text])));
alter table public."engine_shadow_comparisons" add constraint "engine_shadow_comparisons_pkey" PRIMARY KEY (id);
alter table public."engine_shadow_comparisons" add constraint "engine_shadow_comparisons_review_status_check" CHECK ((review_status = ANY (ARRAY['unreviewed'::text, 'looks_good'::text, 'needs_fix'::text, 'expected_difference'::text])));
alter table public."feature_flags" add constraint "feature_flags_pkey" PRIMARY KEY (key);
alter table public."generation_internal_prompts" add constraint "generation_internal_prompts_pkey" PRIMARY KEY (generation_id);
alter table public."generation_jobs" add constraint "generation_jobs_pkey" PRIMARY KEY (id);
alter table public."generation_jobs" add constraint "generation_jobs_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'reserved'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])));
alter table public."generations" add constraint "generations_pkey" PRIMARY KEY (id);
alter table public."help_articles" add constraint "help_articles_pkey" PRIMARY KEY (id);
alter table public."help_articles" add constraint "help_articles_slug_key" UNIQUE (slug);
alter table public."launch_waitlist" add constraint "launch_waitlist_email_length" CHECK (((char_length(email) >= 3) AND (char_length(email) <= 254)));
alter table public."launch_waitlist" add constraint "launch_waitlist_email_normalized" CHECK ((email = lower(TRIM(BOTH FROM email))));
alter table public."launch_waitlist" add constraint "launch_waitlist_email_shape" CHECK ((email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'::text));
alter table public."launch_waitlist" add constraint "launch_waitlist_email_unique" UNIQUE (email);
alter table public."launch_waitlist" add constraint "launch_waitlist_pkey" PRIMARY KEY (id);
alter table public."launch_waitlist" add constraint "launch_waitlist_source_length" CHECK (((char_length(source) >= 1) AND (char_length(source) <= 64)));
alter table public."login_ads" add constraint "login_ads_external_url_length" CHECK (((char_length(external_url) >= 8) AND (char_length(external_url) <= 2048)));
alter table public."login_ads" add constraint "login_ads_external_url_shape" CHECK ((external_url ~ '^https?://'::text));
alter table public."login_ads" add constraint "login_ads_image_path_shape" CHECK ((image_path ~~ 'admin-ads/%'::text));
alter table public."login_ads" add constraint "login_ads_image_url_length" CHECK (((char_length(image_url) >= 8) AND (char_length(image_url) <= 2048)));
alter table public."login_ads" add constraint "login_ads_pkey" PRIMARY KEY (id);
alter table public."login_ads" add constraint "login_ads_weight_range" CHECK (((weight >= 1) AND (weight <= 5)));
alter table public."maro_prompts" add constraint "maro_prompts_access_level_check" CHECK ((access_level = ANY (ARRAY['free'::text, 'premium'::text])));
alter table public."maro_prompts" add constraint "maro_prompts_code_key" UNIQUE (code);
alter table public."maro_prompts" add constraint "maro_prompts_config_object_check" CHECK ((jsonb_typeof(config) = 'object'::text));
alter table public."maro_prompts" add constraint "maro_prompts_pkey" PRIMARY KEY (id);
alter table public."maro_prompts" add constraint "maro_prompts_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'disabled'::text, 'archived'::text])));
alter table public."maro_prompts" add constraint "maro_prompts_tool_check" CHECK ((tool = ANY (ARRAY['imazh'::text, 'logo'::text, 'web'::text])));
alter table public."memberships" add constraint "memberships_paddle_subscription_id_key" UNIQUE (paddle_subscription_id);
alter table public."memberships" add constraint "memberships_pkey" PRIMARY KEY (id);
alter table public."memberships" add constraint "memberships_renewal_mode_check" CHECK ((renewal_mode = ANY (ARRAY['manual'::text, 'automatic'::text])));
alter table public."notification_campaigns" add constraint "notification_campaigns_audience_check" CHECK ((audience = ANY (ARRAY['all'::text, 'authenticated'::text, 'plan_active'::text, 'plan_free'::text])));
alter table public."notification_campaigns" add constraint "notification_campaigns_kind_check" CHECK ((kind = ANY (ARRAY['global_banner'::text, 'tool_banner'::text, 'in_app'::text])));
alter table public."notification_campaigns" add constraint "notification_campaigns_pkey" PRIMARY KEY (id);
alter table public."notification_dismissals" add constraint "notification_dismissals_pkey" PRIMARY KEY (user_id, campaign_id);
alter table public."paddle_webhook_events" add constraint "paddle_webhook_events_pkey" PRIMARY KEY (event_id);
alter table public."platform_spend_rollup" add constraint "platform_spend_rollup_bucket_type_check" CHECK ((bucket_type = ANY (ARRAY['hour'::text, 'day'::text])));
alter table public."platform_spend_rollup" add constraint "platform_spend_rollup_pkey" PRIMARY KEY (bucket_start, bucket_type, user_id, module);
alter table public."preset_categories" add constraint "preset_categories_pkey" PRIMARY KEY (id);
alter table public."preset_categories" add constraint "preset_categories_tool_check" CHECK ((tool = ANY (ARRAY['imazh'::text, 'logo'::text, 'web'::text])));
alter table public."pricing_snapshots" add constraint "pricing_snapshots_pkey" PRIMARY KEY (id);
alter table public."product_events" add constraint "product_events_pkey" PRIMARY KEY (id);
alter table public."profiles" add constraint "profiles_access_role_check" CHECK (((access_role IS NULL) OR (access_role = ANY (ARRAY['super_admin'::text, 'administrator'::text, 'developer'::text, 'editor'::text]))));
alter table public."profiles" add constraint "profiles_maro_plan_check" CHECK (((maro_plan IS NULL) OR (maro_plan = ANY (ARRAY['standard'::text, 'pro'::text, 'biz'::text]))));
alter table public."profiles" add constraint "profiles_pkey" PRIMARY KEY (id);
alter table public."profiles" add constraint "profiles_username_format" CHECK (((username IS NULL) OR (username ~ '^[a-z0-9][a-z0-9_-]{2,29}$'::text)));
alter table public."profiles" add constraint "profiles_username_reserved" CHECK ((username <> ALL (ARRAY['admin'::text, 'administrator'::text, 'support'::text, 'maro'::text, 'maroal'::text, 'api'::text, 'account'::text, 'explore'::text, 'settings'::text, 'nice'::text, 'niceal'::text])));
alter table public."promo_codes" add constraint "promo_codes_code_key" UNIQUE (code);
alter table public."promo_codes" add constraint "promo_codes_discount_percent_check" CHECK (((discount_percent >= 0) AND (discount_percent <= 100)));
alter table public."promo_codes" add constraint "promo_codes_pkey" PRIMARY KEY (id);
alter table public."promo_codes" add constraint "promo_codes_slug_key" UNIQUE (slug);
alter table public."promo_events" add constraint "promo_events_kind_check" CHECK ((kind = ANY (ARRAY['link'::text, 'code'::text])));
alter table public."promo_events" add constraint "promo_events_pkey" PRIMARY KEY (id);
alter table public."prompt_events" add constraint "prompt_events_kind_check" CHECK ((kind = ANY (ARRAY['view'::text, 'copy'::text])));
alter table public."prompt_events" add constraint "prompt_events_pkey" PRIMARY KEY (id);
alter table public."prompt_layers" add constraint "prompt_layers_pkey" PRIMARY KEY (id);
alter table public."prompt_layers" add constraint "prompt_layers_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'review'::text, 'live'::text, 'archived'::text])));
alter table public."prompt_layers" add constraint "prompt_layers_tool_id_layer_key_key" UNIQUE (tool_id, layer_key);
alter table public."prompt_likes" add constraint "prompt_likes_pkey" PRIMARY KEY (user_id, prompt_id);
alter table public."prompt_reveals" add constraint "prompt_reveals_pkey" PRIMARY KEY (user_id, prompt_id);
alter table public."provider_cost_estimates" add constraint "provider_cost_estimates_pkey" PRIMARY KEY (id);
alter table public."public_creations" add constraint "public_creations_pkey" PRIMARY KEY (id);
alter table public."public_creations" add constraint "public_creations_slug_key" UNIQUE (slug);
alter table public."raiaccept_checkouts" add constraint "raiaccept_checkouts_amount_cents_check" CHECK ((amount_cents > 0));
alter table public."raiaccept_checkouts" add constraint "raiaccept_checkouts_creation_state_check" CHECK ((creation_state = ANY (ARRAY['reserved'::text, 'creating'::text, 'created'::text, 'creation_unknown'::text, 'rejected'::text])));
alter table public."raiaccept_checkouts" add constraint "raiaccept_checkouts_credits_check" CHECK ((credits > 0));
alter table public."raiaccept_checkouts" add constraint "raiaccept_checkouts_currency_check" CHECK ((currency = 'EUR'::text));
alter table public."raiaccept_checkouts" add constraint "raiaccept_checkouts_environment_check" CHECK ((environment = ANY (ARRAY['sandbox'::text, 'production'::text])));
alter table public."raiaccept_checkouts" add constraint "raiaccept_checkouts_environment_merchant_account_id_merchan_key" UNIQUE (environment, merchant_account_id, merchant_reference);
alter table public."raiaccept_checkouts" add constraint "raiaccept_checkouts_environment_merchant_account_id_provide_key" UNIQUE (environment, merchant_account_id, provider_order_id);
alter table public."raiaccept_checkouts" add constraint "raiaccept_checkouts_fulfillment_state_check" CHECK ((fulfillment_state = ANY (ARRAY['pending'::text, 'fulfilled'::text, 'manual_review'::text])));
alter table public."raiaccept_checkouts" add constraint "raiaccept_checkouts_payment_state_check" CHECK ((payment_state = ANY (ARRAY['unverified'::text, 'unpaid'::text, 'paid'::text, 'partially_refunded'::text, 'fully_refunded'::text])));
alter table public."raiaccept_checkouts" add constraint "raiaccept_checkouts_pkey" PRIMARY KEY (order_id);
alter table public."raiaccept_checkouts" add constraint "raiaccept_checkouts_session_state_check" CHECK ((session_state = ANY (ARRAY['not_started'::text, 'creating'::text, 'ready'::text, 'creation_unknown'::text, 'rejected'::text])));
alter table public."raiaccept_checkouts" add constraint "raiaccept_checkouts_user_id_environment_request_key_key" UNIQUE (user_id, environment, request_key);
alter table public."raiaccept_receipt_jobs" add constraint "raiaccept_receipt_jobs_pkey" PRIMARY KEY (order_id);
alter table public."raiaccept_receipt_jobs" add constraint "raiaccept_receipt_jobs_state_check" CHECK ((state = ANY (ARRAY['pending'::text, 'sending'::text, 'sent'::text, 'failed'::text])));
alter table public."raiaccept_verification_queue" add constraint "raiaccept_verification_queue_pkey" PRIMARY KEY (order_id);
alter table public."raiaccept_verified_payments" add constraint "raiaccept_verified_payments_amount_cents_check" CHECK ((amount_cents > 0));
alter table public."raiaccept_verified_payments" add constraint "raiaccept_verified_payments_currency_check" CHECK ((currency = 'EUR'::text));
alter table public."raiaccept_verified_payments" add constraint "raiaccept_verified_payments_pkey" PRIMARY KEY (environment, merchant_account_id, transaction_id);
alter table public."rate_limit_events" add constraint "rate_limit_events_pkey" PRIMARY KEY (id);
alter table public."refund_records" add constraint "refund_records_kind_check" CHECK ((kind = ANY (ARRAY['credit'::text, 'payment'::text])));
alter table public."refund_records" add constraint "refund_records_pkey" PRIMARY KEY (id);
alter table public."refund_records" add constraint "refund_records_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'processed'::text, 'rejected'::text])));
alter table public."reports" add constraint "reports_pkey" PRIMARY KEY (id);
alter table public."retention_execution_runs" add constraint "retention_execution_runs_pkey" PRIMARY KEY (id);
alter table public."retention_execution_runs" add constraint "retention_execution_runs_status_check" CHECK ((status = ANY (ARRAY['success'::text, 'partial'::text, 'failed'::text])));
alter table public."security_events" add constraint "security_events_pkey" PRIMARY KEY (id);
alter table public."security_events" add constraint "security_events_severity_check" CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'critical'::text])));
alter table public."signup_signals" add constraint "signup_signals_pkey" PRIMARY KEY (id);
alter table public."storage_usage" add constraint "storage_usage_pkey" PRIMARY KEY (user_id);
alter table public."support_ticket_messages" add constraint "support_ticket_messages_author_role_check" CHECK ((author_role = ANY (ARRAY['user'::text, 'admin'::text, 'system'::text])));
alter table public."support_ticket_messages" add constraint "support_ticket_messages_pkey" PRIMARY KEY (id);
alter table public."support_tickets" add constraint "support_tickets_pkey" PRIMARY KEY (id);
alter table public."support_tickets" add constraint "support_tickets_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])));
alter table public."support_tickets" add constraint "support_tickets_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'pending'::text, 'resolved'::text, 'closed'::text])));
alter table public."system_prompt_versions" add constraint "system_prompt_versions_pkey" PRIMARY KEY (id);
alter table public."system_prompt_versions" add constraint "system_prompt_versions_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'review'::text, 'live'::text, 'archived'::text])));
alter table public."system_prompt_versions" add constraint "system_prompt_versions_tool_id_version_label_key" UNIQUE (tool_id, version_label);
alter table public."tool_engine_config" add constraint "tool_engine_config_pkey" PRIMARY KEY (tool_id);
alter table public."tool_engine_config" add constraint "tool_engine_config_production_pipeline_check" CHECK ((production_pipeline = ANY (ARRAY['legacy'::text, 'shadow'::text, 'engine'::text, 'engine_v2'::text])));
alter table public."tool_engine_config" add constraint "tool_engine_config_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'beta'::text, 'maintenance'::text, 'disabled'::text, 'coming_soon'::text])));
alter table public."tool_input_fields" add constraint "tool_input_fields_field_type_check" CHECK ((field_type = ANY (ARRAY['select'::text, 'multi-select'::text, 'text'::text, 'textarea'::text, 'number'::text, 'toggle'::text, 'slider'::text, 'color'::text, 'asset'::text, 'position-grid'::text])));
alter table public."tool_input_fields" add constraint "tool_input_fields_pkey" PRIMARY KEY (id);
alter table public."tool_input_fields" add constraint "tool_input_fields_tool_id_field_key_key" UNIQUE (tool_id, field_key);
alter table public."tool_model_configs" add constraint "tool_model_configs_pkey" PRIMARY KEY (id);
alter table public."tool_model_configs" add constraint "tool_model_configs_tool_id_model_id_key" UNIQUE (tool_id, model_id);
alter table public."user_notifications" add constraint "user_notifications_pkey" PRIMARY KEY (id);
alter table public."user_notifications" add constraint "user_notifications_user_id_dedupe_key_key" UNIQUE (user_id, dedupe_key);
alter table public."weekly_challenges" add constraint "weekly_challenges_pkey" PRIMARY KEY (id);
alter table public."weekly_challenges" add constraint "weekly_challenges_slug_key" UNIQUE (slug);
alter table public."workspace_sources" add constraint "workspace_sources_pkey" PRIMARY KEY (id);
alter table public."workspaces" add constraint "workspaces_pkey" PRIMARY KEY (id);
alter table public."abuse_events" add constraint "abuse_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."audit_events" add constraint "audit_events_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."business_leads" add constraint "business_leads_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."challenge_entries" add constraint "challenge_entries_challenge_id_fkey" FOREIGN KEY (challenge_id) REFERENCES weekly_challenges(id) ON DELETE CASCADE;
alter table public."challenge_entries" add constraint "challenge_entries_creation_id_fkey" FOREIGN KEY (creation_id) REFERENCES public_creations(id) ON DELETE SET NULL;
alter table public."challenge_entries" add constraint "challenge_entries_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."contest_submissions" add constraint "contest_submissions_contest_id_fkey" FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE;
alter table public."contest_submissions" add constraint "contest_submissions_creation_id_fkey" FOREIGN KEY (creation_id) REFERENCES public_creations(id) ON DELETE SET NULL;
alter table public."contest_submissions" add constraint "contest_submissions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."creation_likes" add constraint "creation_likes_creation_id_fkey" FOREIGN KEY (creation_id) REFERENCES public_creations(id) ON DELETE CASCADE;
alter table public."creation_likes" add constraint "creation_likes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."creation_saves" add constraint "creation_saves_creation_id_fkey" FOREIGN KEY (creation_id) REFERENCES public_creations(id) ON DELETE CASCADE;
alter table public."creation_saves" add constraint "creation_saves_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."creation_views" add constraint "creation_views_creation_id_fkey" FOREIGN KEY (creation_id) REFERENCES public_creations(id) ON DELETE CASCADE;
alter table public."creator_commissions" add constraint "creator_commissions_creator_id_fkey" FOREIGN KEY (creator_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."creator_commissions" add constraint "creator_commissions_paid_by_fkey" FOREIGN KEY (paid_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."creator_commissions" add constraint "creator_commissions_reversed_by_fkey" FOREIGN KEY (reversed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."creator_follows" add constraint "creator_follows_creator_id_fkey" FOREIGN KEY (creator_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."creator_follows" add constraint "creator_follows_follower_id_fkey" FOREIGN KEY (follower_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."credit_orders" add constraint "credit_orders_membership_id_fkey" FOREIGN KEY (membership_id) REFERENCES memberships(id) ON DELETE SET NULL;
alter table public."credit_orders" add constraint "credit_orders_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."credit_transactions" add constraint "credit_transactions_membership_id_fkey" FOREIGN KEY (membership_id) REFERENCES memberships(id) ON DELETE SET NULL;
alter table public."credit_transactions" add constraint "credit_transactions_order_id_fkey" FOREIGN KEY (order_id) REFERENCES credit_orders(id) ON DELETE SET NULL;
alter table public."credit_transactions" add constraint "credit_transactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."email_logs" add constraint "email_logs_outbox_id_fkey" FOREIGN KEY (outbox_id) REFERENCES email_outbox(id) ON DELETE SET NULL;
alter table public."email_logs" add constraint "email_logs_recipient_user_id_fkey" FOREIGN KEY (recipient_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."email_outbox" add constraint "email_outbox_recipient_user_id_fkey" FOREIGN KEY (recipient_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."email_template_versions" add constraint "email_template_versions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."email_template_versions" add constraint "email_template_versions_published_by_fkey" FOREIGN KEY (published_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."email_template_versions" add constraint "email_template_versions_template_id_fkey" FOREIGN KEY (template_id) REFERENCES email_templates(id) ON DELETE CASCADE;
alter table public."email_templates" add constraint "email_templates_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."email_templates" add constraint "email_templates_live_version_id_fkey" FOREIGN KEY (live_version_id) REFERENCES email_template_versions(id) ON DELETE SET NULL;
alter table public."engine_internal_canary_users" add constraint "engine_internal_canary_users_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
alter table public."engine_internal_canary_users" add constraint "engine_internal_canary_users_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."engine_shadow_comparisons" add constraint "engine_shadow_comparisons_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL;
alter table public."generation_internal_prompts" add constraint "generation_internal_prompts_generation_id_fkey" FOREIGN KEY (generation_id) REFERENCES generations(id) ON DELETE CASCADE;
alter table public."generation_jobs" add constraint "generation_jobs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."generations" add constraint "generations_job_id_fkey" FOREIGN KEY (job_id) REFERENCES generation_jobs(id) ON DELETE SET NULL;
alter table public."generations" add constraint "generations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."generations" add constraint "generations_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL;
alter table public."login_ads" add constraint "login_ads_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."maro_prompts" add constraint "maro_prompts_category_id_fkey" FOREIGN KEY (category_id) REFERENCES preset_categories(id) ON DELETE SET NULL;
alter table public."memberships" add constraint "memberships_paddle_origin_order_id_fkey" FOREIGN KEY (paddle_origin_order_id) REFERENCES credit_orders(id);
alter table public."memberships" add constraint "memberships_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES commerce_plans(id);
alter table public."memberships" add constraint "memberships_renewed_from_id_fkey" FOREIGN KEY (renewed_from_id) REFERENCES memberships(id) ON DELETE SET NULL;
alter table public."memberships" add constraint "memberships_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."notification_campaigns" add constraint "notification_campaigns_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."notification_dismissals" add constraint "notification_dismissals_campaign_id_fkey" FOREIGN KEY (campaign_id) REFERENCES notification_campaigns(id) ON DELETE CASCADE;
alter table public."notification_dismissals" add constraint "notification_dismissals_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."pricing_snapshots" add constraint "pricing_snapshots_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."product_events" add constraint "product_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."profiles" add constraint "profiles_active_workspace_id_fkey" FOREIGN KEY (active_workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL;
alter table public."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."promo_codes" add constraint "promo_codes_creator_id_fkey" FOREIGN KEY (creator_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public."promo_events" add constraint "promo_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public."prompt_events" add constraint "prompt_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."prompt_layers" add constraint "prompt_layers_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."prompt_layers" add constraint "prompt_layers_tool_id_fkey" FOREIGN KEY (tool_id) REFERENCES tool_engine_config(tool_id) ON DELETE CASCADE;
alter table public."prompt_layers" add constraint "prompt_layers_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."prompt_likes" add constraint "prompt_likes_prompt_id_fkey" FOREIGN KEY (prompt_id) REFERENCES maro_prompts(id) ON DELETE CASCADE;
alter table public."prompt_likes" add constraint "prompt_likes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."prompt_reveals" add constraint "prompt_reveals_prompt_id_fkey" FOREIGN KEY (prompt_id) REFERENCES maro_prompts(id) ON DELETE CASCADE;
alter table public."prompt_reveals" add constraint "prompt_reveals_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."public_creations" add constraint "public_creations_remix_of_fkey" FOREIGN KEY (remix_of) REFERENCES public_creations(id) ON DELETE SET NULL;
alter table public."public_creations" add constraint "public_creations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."raiaccept_checkouts" add constraint "raiaccept_checkouts_expected_membership_id_fkey" FOREIGN KEY (expected_membership_id) REFERENCES memberships(id);
alter table public."raiaccept_checkouts" add constraint "raiaccept_checkouts_order_id_fkey" FOREIGN KEY (order_id) REFERENCES credit_orders(id);
alter table public."raiaccept_checkouts" add constraint "raiaccept_checkouts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);
alter table public."raiaccept_receipt_jobs" add constraint "raiaccept_receipt_jobs_order_id_fkey" FOREIGN KEY (order_id) REFERENCES raiaccept_checkouts(order_id);
alter table public."raiaccept_verification_queue" add constraint "raiaccept_verification_queue_order_id_fkey" FOREIGN KEY (order_id) REFERENCES raiaccept_checkouts(order_id);
alter table public."raiaccept_verified_payments" add constraint "raiaccept_verified_payments_order_id_fkey" FOREIGN KEY (order_id) REFERENCES raiaccept_checkouts(order_id);
alter table public."refund_records" add constraint "refund_records_processed_by_fkey" FOREIGN KEY (processed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."refund_records" add constraint "refund_records_report_id_fkey" FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE SET NULL;
alter table public."refund_records" add constraint "refund_records_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE SET NULL;
alter table public."refund_records" add constraint "refund_records_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."reports" add constraint "reports_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public."security_events" add constraint "security_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."signup_signals" add constraint "signup_signals_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."storage_usage" add constraint "storage_usage_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."support_ticket_messages" add constraint "support_ticket_messages_author_id_fkey" FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."support_ticket_messages" add constraint "support_ticket_messages_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE;
alter table public."support_tickets" add constraint "support_tickets_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."support_tickets" add constraint "support_tickets_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."system_prompt_versions" add constraint "system_prompt_versions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."system_prompt_versions" add constraint "system_prompt_versions_published_by_fkey" FOREIGN KEY (published_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."system_prompt_versions" add constraint "system_prompt_versions_tool_id_fkey" FOREIGN KEY (tool_id) REFERENCES tool_engine_config(tool_id) ON DELETE CASCADE;
alter table public."tool_engine_config" add constraint "tool_engine_config_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."tool_input_fields" add constraint "tool_input_fields_tool_id_fkey" FOREIGN KEY (tool_id) REFERENCES tool_engine_config(tool_id) ON DELETE CASCADE;
alter table public."tool_model_configs" add constraint "tool_model_configs_tool_id_fkey" FOREIGN KEY (tool_id) REFERENCES tool_engine_config(tool_id) ON DELETE CASCADE;
alter table public."user_notifications" add constraint "user_notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."workspace_sources" add constraint "workspace_sources_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."workspace_sources" add constraint "workspace_sources_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
alter table public."workspaces" add constraint "workspaces_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
create extension if not exists pg_trgm with schema public;
CREATE OR REPLACE FUNCTION public.admin_adjust_credits(p_actor uuid, p_user uuid, p_delta integer, p_reason text, p_idempotency_key text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  old_balance integer;
  new_balance integer;
  abs_amount integer;
  existing_id uuid;
  meta jsonb;
begin
  if p_delta = 0 then
    return jsonb_build_object('ok', false, 'error', 'zero_delta');
  end if;

  if coalesce(trim(p_reason), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'reason_required');
  end if;

  if p_idempotency_key is not null then
    select id into existing_id
    from public.credit_transactions
    where user_id = p_user
      and idempotency_key = p_idempotency_key
      and type = 'manual_adjustment'
    limit 1;
    if existing_id is not null then
      select credits into new_balance from public.profiles where id = p_user;
      return jsonb_build_object(
        'ok', true,
        'already', true,
        'balance', coalesce(new_balance, 0)
      );
    end if;
  end if;

  select credits into old_balance
  from public.profiles
  where id = p_user
  for update;

  if old_balance is null then
    return jsonb_build_object('ok', false, 'error', 'user_not_found');
  end if;

  new_balance := old_balance + p_delta;
  if new_balance < 0 then
    return jsonb_build_object('ok', false, 'error', 'insufficient_balance');
  end if;

  abs_amount := abs(p_delta);

  update public.profiles
  set credits = new_balance
  where id = p_user;

  meta := coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
    'reason', p_reason,
    'actor_id', p_actor,
    'delta', p_delta,
    'old_balance', old_balance,
    'new_balance', new_balance
  );

  insert into public.credit_transactions (
    user_id, type, amount, balance_after, idempotency_key, metadata
  )
  values (
    p_user,
    'manual_adjustment',
    abs_amount,
    new_balance,
    p_idempotency_key,
    meta
  );

  return jsonb_build_object(
    'ok', true,
    'already', false,
    'balance', new_balance,
    'old_balance', old_balance,
    'delta', p_delta
  );
end;
$function$;
revoke all on function public.admin_adjust_credits(uuid,uuid,integer,text,text,jsonb) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.admin_grant_plan(p_actor uuid, p_user uuid, p_plan text, p_duration_days integer, p_note text, p_grant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  actor_role text;
  actor_email text;
  existing public.memberships%rowtype;
  grant_audit public.audit_events%rowtype;
  grant_expiry timestamptz;
begin
  if auth.role() is distinct from 'service_role' then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  select case
    when access_role in ('super_admin', 'administrator', 'developer', 'editor') then access_role
    when is_admin then 'super_admin'
    else null end, email
  into actor_role, actor_email from public.profiles where id = p_actor;
  if actor_role is null or actor_role not in ('super_admin', 'administrator') then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_plan is null or p_plan not in ('standard', 'pro', 'business')
    or not exists(select 1 from public.commerce_plans where id = p_plan and enabled) then
    return jsonb_build_object('ok', false, 'error', 'invalid_plan');
  end if;
  if p_duration_days is null or p_duration_days < 1 or p_duration_days > 365 then
    return jsonb_build_object('ok', false, 'error', 'invalid_duration');
  end if;
  if p_note is null or length(trim(p_note)) < 3 or length(trim(p_note)) > 1000 or p_grant_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_note');
  end if;

  -- Serialize manual grants for this account, including retries from another tab.
  perform 1 from public.profiles where id = p_user for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'user_not_found');
  end if;
  select * into existing from public.memberships where id = p_grant_id;
  if found then
    select * into grant_audit from public.audit_events
      where action = 'users.plan_granted_manually' and target_type = 'membership'
        and target_id = p_grant_id::text limit 1;
    if existing.user_id is distinct from p_user or existing.plan_id is distinct from p_plan
      or grant_audit.actor_id is distinct from p_actor
      or grant_audit.metadata->>'note' is distinct from trim(p_note)
      or grant_audit.metadata->>'duration_days' is distinct from p_duration_days::text then
      return jsonb_build_object('ok', false, 'error', 'idempotency_conflict');
    end if;
    return jsonb_build_object('ok', true, 'already', true,
      'membership_id', existing.id, 'expires_at', existing.expires_at);
  end if;

  -- Never replace, shorten, or hide a paid/current membership.
  select * into existing from public.memberships
    where user_id = p_user and expires_at > now()
    order by expires_at desc limit 1;
  if found then
    return jsonb_build_object('ok', false, 'error', 'existing_plan', 'expires_at', existing.expires_at);
  end if;

  grant_expiry := now() + p_duration_days * interval '1 day';
  insert into public.memberships(id, user_id, plan_id, started_at, expires_at, renewal_mode)
    values(p_grant_id, p_user, p_plan, now(), grant_expiry, 'manual');
  update public.profiles set maro_plan = p_plan where id = p_user;
  -- Private comments must not live in memberships, which owners can read through RLS.
  insert into public.audit_events(actor_id, action, target_type, target_id, after_state, metadata)
    values(p_actor, 'users.plan_granted_manually', 'membership', p_grant_id::text,
      jsonb_build_object('user_id', p_user, 'plan_id', p_plan, 'expires_at', grant_expiry),
      jsonb_build_object('source', 'manual', 'note', trim(p_note), 'duration_days', p_duration_days,
        'actor_email', actor_email, 'credits_granted', 0));
  return jsonb_build_object('ok', true, 'already', false,
    'membership_id', p_grant_id, 'expires_at', grant_expiry);
end;
$function$;
revoke all on function public.admin_grant_plan(uuid,uuid,text,integer,text,uuid) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.admin_publish_v1_prompt(p_id uuid, p_actor uuid, p_rollback boolean DEFAULT false)
 RETURNS system_prompt_versions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare t public.system_prompt_versions;
begin
  select * into t from public.system_prompt_versions where id=p_id;
  if t.id is null or t.tool_id not in ('maro_imazh','maro_logo') then raise exception 'invalid_prompt'; end if;
  perform 1 from public.tool_engine_config where tool_id=t.tool_id for update;
  select * into t from public.system_prompt_versions where id=p_id for update;
  if (not p_rollback and t.status not in ('draft','review')) or (p_rollback and t.status <> 'archived') then raise exception 'invalid_prompt_status'; end if;
  if length(btrim(t.content))=0 or length(t.content)>100000 then raise exception 'invalid_prompt_content'; end if;
  update public.system_prompt_versions set status='archived' where tool_id=t.tool_id and status='live';
  update public.system_prompt_versions set status='live',published_by=p_actor,published_at=now() where id=p_id returning * into t;
  return t;
end $function$;
revoke all on function public.admin_publish_v1_prompt(uuid,uuid,boolean) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.admin_save_v1_models(p_tool text, p_models jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare m jsonb; expected_count integer;
begin
  if p_tool not in ('maro_imazh','maro_logo') then raise exception 'invalid_module'; end if;
  perform 1 from public.tool_engine_config where tool_id=p_tool for update;
  expected_count := case when p_tool='maro_logo' then 1 else 2 end;
  if jsonb_typeof(p_models) <> 'array' or jsonb_array_length(p_models) <> expected_count then raise exception 'invalid_model_set'; end if;
  if (select count(distinct value->>'key') from jsonb_array_elements(p_models)) <> expected_count
    or (select count(*) from jsonb_array_elements(p_models) where value->>'isDefault'='true') <> 1
    or (select count(*) from jsonb_array_elements(p_models) where value->>'isDefault'='true' and value->>'enabled'='true') <> 1 then raise exception 'invalid_default'; end if;
  for m in select value from jsonb_array_elements(p_models) loop
    if m->>'key' not in ('flare','sunburst') or (p_tool='maro_logo' and m->>'key'<>'flare')
      or jsonb_typeof(m->'enabled') is distinct from 'boolean' or jsonb_typeof(m->'isDefault') is distinct from 'boolean'
      or jsonb_typeof(m->'customerCredits') is distinct from 'number' or (m->>'customerCredits') !~ '^[1-9][0-9]*$'
      or (m->>'customerCredits')::numeric>2147483647
      or jsonb_typeof(m->'order') is distinct from 'number' or (m->>'order') !~ '^[0-9]+$'
      or (m->>'order')::numeric>2147483647
      or jsonb_typeof(m->'label') is distinct from 'string' or length(btrim(m->>'label')) not between 1 and 80
      or jsonb_typeof(m->'descriptor') is distinct from 'string' or length(m->>'descriptor')>240
      then raise exception 'invalid_model_configuration'; end if;
    if not exists(select 1 from public.tool_model_configs where tool_id=p_tool and model_id=m->>'key'
      and provider='openai' and metadata->>'providerModelId'='gpt-image-2.5-'||(m->>'key')) then raise exception 'model_not_configured'; end if;
  end loop;
  -- Unique partial index requires clearing the old default within this transaction.
  update public.tool_model_configs set is_default=false where tool_id=p_tool and is_default;
  for m in select value from jsonb_array_elements(p_models) loop
    update public.tool_model_configs set display_name=btrim(m->>'label'),enabled=(m->>'enabled')::boolean,
      is_default=(m->>'isDefault')::boolean,coming_soon=false,sort_order=(m->>'order')::integer,
      metadata=metadata||jsonb_build_object('description',m->>'descriptor'),
      cost_metadata=cost_metadata||jsonb_build_object('customerCredits',(m->>'customerCredits')::integer),updated_at=clock_timestamp()
      where tool_id=p_tool and model_id=m->>'key';
  end loop;
end $function$;
revoke all on function public.admin_save_v1_models(text,jsonb) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.admin_v1_operations(p_before timestamp with time zone DEFAULT NULL::timestamp with time zone, p_status text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
with jobs as (
 select * from public.generation_jobs where metadata->>'v1_durable'='true' and metadata#>>'{v1_request,module}' in ('maro_imazh','maro_logo')
), page as (
 select * from jobs where (p_before is null or created_at<p_before) and (p_status is null or status=p_status)
 order by created_at desc,id desc limit 50
), evidence as (
 select j.*, g.id as generation_id,
 exists(select 1 from storage.objects o where o.bucket_id='generations' and o.name=j.user_id::text||'/'||j.id::text||'/output.png' and coalesce((o.metadata->>'size')::bigint,0)>0) as stored,
 exists(select 1 from public.credit_transactions t where t.job_id=j.id and t.type='charge') as charged,
 exists(select 1 from public.credit_transactions t where t.job_id=j.id and t.type='release') as released
 from page j left join public.generations g on g.job_id=j.id
)
select jsonb_build_object(
 'counts',(select jsonb_build_object('total',count(*),'failed',count(*) filter(where status='failed'),
 'pending',count(*) filter(where status in ('pending','reserved','processing')),
 'stale',count(*) filter(where status in ('pending','reserved','processing') and created_at<=now()-interval '15 minutes'),
 'settlementPending',count(*) filter(where metadata#>>'{v1_lifecycle,phase}'='settlement_pending' and status not in ('completed','failed','cancelled'))) from jobs),
 'jobs',coalesce((select jsonb_agg(jsonb_build_object(
 'id',id,'createdAt',created_at,'userId',user_id,'module',metadata#>>'{v1_request,module}','model',metadata#>>'{v1_request,logicalModel}',
 'provider',metadata#>>'{v1_request,model,provider}','providerModelId',metadata#>>'{v1_request,model,providerModelId}',
 'status',status,'generationId',generation_id,'reserved',credits_reserved,'charged',credits_charged,
 'configuredCredits',metadata#>'{v1_request,model,customerCredits}',
 'output',case when stored then 'stored' else 'missing' end,'history',case when generation_id is not null then 'saved' else 'missing' end,
 'settlement',case when charged then 'charged' when released then 'released' when credits_reserved>0 then 'reserved' else 'none' end,
 'phase',metadata#>>'{v1_lifecycle,phase}',
 'failure',case when error in ('provider_failed','provider_output_invalid','storage_failed','history_failed','execution_trace_unavailable','execution_interrupted','settlement_pending') then error when error is not null then 'other_failure' else null end,
 'retainedOrphan',stored and generation_id is null and (status in ('failed','cancelled') or created_at<=now()-interval '15 minutes'),'recoveredFromJobId',metadata->>'recovered_from_job_id',
 'latencyMs',metadata#>'{execution,image_provider,latencyMs}',
 'eligible',status in ('pending','reserved','processing') and created_at<=now()-interval '15 minutes'
 ) order by created_at desc,id desc) from evidence),'[]'::jsonb),
 'recentReconciliation',coalesce((select jsonb_agg(a) from (select created_at,action,target_id,metadata from public.audit_events
 where action='v1.job.reconciled' order by created_at desc limit 10) a),'[]'::jsonb)
);
$function$;
revoke all on function public.admin_v1_operations(timestamp with time zone,text) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.apply_paddle_event(p_event jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  seed public.credit_orders%rowtype;
  o public.credit_orders%rowtype;
  m public.memberships%rowtype;
  kind text := p_event->>'kind';
  event_time timestamptz := (p_event->>'occurredAt')::timestamptz;
  period_start timestamptz := (p_event->>'startsAt')::timestamptz;
  period_end timestamptz := (p_event->>'endsAt')::timestamptz;
  sub_id text := p_event->>'subscriptionId';
  tx_id text := p_event->>'transactionId';
  customer_id text := p_event->>'customerId';
  state text := p_event->>'status';
  new_balance integer; added integer; order_type text; new_expiry timestamptz;
begin
  if p_event->>'eventId' is null or event_time is null then raise exception 'invalid_event'; end if;
  insert into public.paddle_webhook_events(event_id, event_type, occurred_at)
    values(p_event->>'eventId', p_event->>'eventType', event_time) on conflict do nothing;
  get diagnostics added = row_count;
  if added = 0 then return jsonb_build_object('duplicate', true); end if;
  if kind = 'ignored' then return jsonb_build_object('ignored', true); end if;
  if kind not in ('subscription', 'transaction') then raise exception 'invalid_event_kind'; end if;
  select * into seed from public.credit_orders where id = (p_event->>'seedOrderId')::uuid;
  if seed.id is null or seed.provider <> 'paddle' or seed.user_id::text <> p_event->>'userId'
    or seed.provider_transaction_id is null or seed.paddle_customer_id is distinct from customer_id
    or seed.paddle_price_id is distinct from p_event->>'priceId'
    or (seed.paddle_subscription_id is not null and seed.paddle_subscription_id is distinct from sub_id) then
    raise exception 'paddle_mapping_mismatch';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(seed.user_id::text, 742));
  -- A customer must never become a portal bridge across maro accounts.
  if exists(select 1 from public.credit_orders where paddle_customer_id = customer_id
    and user_id <> seed.user_id) then raise exception 'paddle_customer_ownership_mismatch'; end if;
  select * into m from public.memberships where paddle_subscription_id = sub_id for update;
  if m.id is not null and (m.user_id <> seed.user_id or m.paddle_customer_id <> customer_id
    or m.paddle_origin_order_id <> seed.id) then raise exception 'paddle_subscription_ownership_mismatch'; end if;

  if sub_id is not null and m.id is null then
    -- Only the bound initial transaction or subscription.created's transaction_id
    -- can establish a subscription link. Updated events arriving first are retried.
    if tx_id is distinct from seed.provider_transaction_id or seed.order_kind <> 'plan_purchase' then
      raise exception 'paddle_subscription_not_bound';
    end if;
    if exists(select 1 from public.memberships where user_id = seed.user_id
      and (expires_at > now() or (payment_provider = 'paddle' and paddle_status <> 'canceled'))) then
      raise exception 'another_membership_active';
    end if;
    insert into public.memberships(user_id, plan_id, started_at, expires_at, renewal_mode,
      payment_provider, paddle_subscription_id, paddle_customer_id, paddle_price_id,
      paddle_origin_order_id, paddle_status)
    values(seed.user_id, seed.item_id, coalesce(period_start, event_time),
      coalesce(period_start, event_time), 'automatic', 'paddle', sub_id, customer_id,
      seed.paddle_price_id, seed.id, 'pending') returning * into m;
    update public.credit_orders set paddle_subscription_id = sub_id where id = seed.id;
  end if;

  if kind = 'subscription' then
    if m.id is null or state not in ('active', 'trialing', 'past_due', 'paused', 'canceled') then
      raise exception 'invalid_subscription';
    end if;
    if m.paddle_event_at is null or event_time > m.paddle_event_at then
      -- A lifecycle event cannot extend paid time. Only completed payment can.
      new_expiry := coalesce(m.paddle_paid_through, m.expires_at);
      if state in ('canceled', 'paused') then new_expiry := least(new_expiry, event_time); end if;
      update public.memberships set paddle_status = state, paddle_event_at = event_time,
        paddle_scheduled_change = nullif(p_event->'scheduledChange', 'null'::jsonb),
        expires_at = new_expiry, updated_at = now()
        where id = m.id;
    end if;
    return jsonb_build_object('synchronized', true);
  end if;

  if state <> 'completed' or tx_id is null or (p_event->>'amount')::integer <> seed.amount_cents
    or p_event->>'currency' <> seed.currency then raise exception 'paddle_amount_mismatch'; end if;
  select * into o from public.credit_orders where provider_transaction_id = tx_id for update;
  if o.id is not null and (o.provider <> 'paddle' or o.user_id <> seed.user_id) then
    raise exception 'paddle_transaction_ownership_mismatch';
  end if;
  if o.status = 'paid' then return jsonb_build_object('duplicate_transaction', true); end if;
  if sub_id is null then
    if seed.order_kind <> 'topup' or tx_id <> seed.provider_transaction_id then raise exception 'invalid_topup_transaction'; end if;
    o := seed;
    order_type := 'topup';
    -- Eligibility was checked when checkout was created. A delayed paid webhook
    -- still delivers purchased credits even if the membership has since expired.
  else
    if m.id is null or period_start is null or period_end is null or period_end <= period_start
      or period_end - period_start <> ((seed.commercial_snapshot->>'duration_days')::integer * interval '1 day') then
      raise exception 'invalid_billing_period';
    end if;
    if exists(select 1 from public.credit_orders where provider = 'paddle' and status = 'paid'
      and paddle_subscription_id = sub_id and paddle_period_start = period_start) then
      return jsonb_build_object('duplicate_period', true);
    end if;
    -- Reject overlapping payments without dropping legitimate late older periods.
    if exists(select 1 from public.credit_orders where provider = 'paddle' and status = 'paid'
      and paddle_subscription_id = sub_id and paddle_period_start < period_end
      and paddle_period_end > period_start) then raise exception 'overlapping_billing_period'; end if;
    if tx_id = seed.provider_transaction_id then
      o := seed; order_type := 'plan_purchase';
    else
      if p_event->>'origin' <> 'subscription_recurring' then raise exception 'unexpected_transaction_origin'; end if;
      order_type := 'plan_renewal';
      insert into public.credit_orders(user_id, user_email, credits, amount_cents, currency, status,
        provider, item_type, item_id, order_kind, commercial_snapshot, billing_snapshot,
        provider_transaction_id, paddle_customer_id, paddle_subscription_id, paddle_price_id)
      values(seed.user_id, seed.user_email, seed.credits, seed.amount_cents, seed.currency, 'pending',
        'paddle', 'plan', seed.item_id, order_type,
        seed.commercial_snapshot || jsonb_build_object('order_kind', order_type, 'captured_at', event_time),
        seed.billing_snapshot, tx_id, customer_id, sub_id, seed.paddle_price_id) returning * into o;
    end if;
    -- Lifecycle ordering is independent from paid-period ordering.
    new_expiry := greatest(coalesce(m.paddle_paid_through, period_end), period_end);
    if m.paddle_status in ('canceled', 'paused') then
      new_expiry := least(new_expiry, m.paddle_event_at);
    end if;
    update public.memberships set paddle_paid_through = greatest(paddle_paid_through, period_end),
      expires_at = new_expiry, started_at = least(started_at, period_start),
      paddle_status = case when paddle_status = 'pending' then 'active' else paddle_status end,
      updated_at = now() where id = m.id;
  end if;
  if o.status <> 'pending' then raise exception 'invalid_order_status'; end if;
  update public.profiles set credits = credits + seed.credits,
    maro_plan = case when sub_id is not null and new_expiry > now() then seed.item_id else maro_plan end
    where id = seed.user_id returning credits into new_balance;
  if new_balance is null then raise exception 'profile_missing'; end if;
  insert into public.credit_transactions(user_id, type, amount, balance_after, idempotency_key,
    order_id, membership_id, metadata)
  values(seed.user_id, order_type, seed.credits, new_balance, 'paddle:' || tx_id, o.id, m.id,
    jsonb_build_object('provider', 'paddle', 'transaction_id', tx_id, 'event_id', p_event->>'eventId'));
  update public.credit_orders set status = 'paid', paid_at = event_time, membership_id = m.id,
    paddle_subscription_id = sub_id, paddle_period_start = period_start, paddle_period_end = period_end
    where id = o.id;
  return jsonb_build_object('fulfilled', true, 'order_id', o.id);
end;
$function$;
revoke all on function public.apply_paddle_event(jsonb) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.apply_raiaccept_verification(p_order_id uuid, p_lease_id uuid, p_order jsonb, p_transaction jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  c public.raiaccept_checkouts%rowtype; o public.credit_orders%rowtype; m record;
  payment public.raiaccept_verified_payments%rowtype; uid uuid; bank_paid_at timestamptz; reason text;
  effective text:='NO_PLAN'; new_balance integer; granted_membership_id uuid; days integer; new_expires timestamptz;
  bank_status text:=p_order->>'status'; tx_id text:=p_transaction->>'id'; count_paid integer;
begin
  if auth.role() is distinct from 'service_role' then return jsonb_build_object('ok',false,'error','forbidden'); end if;
  select user_id into uid from public.raiaccept_checkouts where order_id=p_order_id;
  if uid is null then return jsonb_build_object('ok',false,'error','not_found'); end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,742));
  select * into c from public.raiaccept_checkouts where order_id=p_order_id for update;
  if p_lease_id is null or c.verification_lease_id is distinct from p_lease_id then return jsonb_build_object('ok',false,'error','lease_mismatch'); end if;
  select * into o from public.credit_orders where id=p_order_id for update;
  if p_order->>'id' is null or p_order->>'id' !~ '^[A-Za-z0-9_-]{1,150}$'
    or (c.provider_order_id is not null and c.provider_order_id is distinct from p_order->>'id')
    or p_order->>'merchantAccountId' is distinct from c.merchant_account_id or p_order->>'merchantReference' is distinct from c.merchant_reference
    or p_order->>'currency' is distinct from c.currency or jsonb_typeof(p_order->'amountCents') is distinct from 'number'
    or (p_order->>'amountCents')::numeric<>c.amount_cents or jsonb_typeof(p_order->'isProduction') is distinct from 'boolean'
    or (p_order->>'isProduction')::boolean is distinct from (c.environment='production')
    or bank_status is null or bank_status not in ('DRAFT','CHECKOUT','PAID','PARTIALLY_REFUNDED','FULLY_REFUNDED','FAILED','CANCELED','ABANDONED') then
    return jsonb_build_object('ok',false,'error','provider_order_mismatch'); end if;
  if o.provider is distinct from 'raiaccept' or o.user_id is distinct from c.user_id or o.amount_cents<>c.amount_cents or o.credits<>c.credits
    or o.currency<>c.currency or o.order_kind is distinct from c.commercial_snapshot->>'order_kind'
    or o.commercial_snapshot is distinct from c.commercial_snapshot or o.billing_snapshot is distinct from c.billing_snapshot then
    return jsonb_build_object('ok',false,'error','local_snapshot_mismatch'); end if;
  if c.provider_order_id is null then
    -- A notification may discover an order after a lost creation response. Only authenticated matching evidence binds it.
    update public.raiaccept_checkouts set provider_order_id=p_order->>'id',creation_state='created',lease_id=null,
      session_state=case when bank_status='DRAFT' then session_state else 'creation_unknown' end where order_id=p_order_id;
    update public.credit_orders set provider_order_id=p_order->>'id' where id=p_order_id;
  end if;
  update public.raiaccept_checkouts set verified_order_status=bank_status,last_verified_at=now(),last_error=null,updated_at=now(),
    last_verified_summary=jsonb_build_object('provider_order_id',p_order->>'id','status',bank_status,'amount_cents',c.amount_cents,
      'currency',c.currency,'merchant_reference',c.merchant_reference,'environment',c.environment,'transaction_id',tx_id,
      'successful_purchase_count',p_order->'purchaseCount') where order_id=p_order_id;
  if bank_status in ('PAID','PARTIALLY_REFUNDED','FULLY_REFUNDED') then
    if p_transaction is null or tx_id is null or tx_id !~ '^[A-Za-z0-9_-]{1,150}$'
      or p_transaction->>'orderId' is distinct from p_order->>'id' or p_transaction->>'merchantAccountId' is distinct from c.merchant_account_id
      or p_transaction->>'merchantReference' is distinct from c.merchant_reference or p_transaction->>'currency' is distinct from c.currency
      or jsonb_typeof(p_transaction->'amountCents') is distinct from 'number' or (p_transaction->>'amountCents')::numeric<>c.amount_cents
      or jsonb_typeof(p_transaction->'isProduction') is distinct from 'boolean' or (p_transaction->>'isProduction')::boolean is distinct from (c.environment='production')
      or p_transaction->>'type' is distinct from 'PURCHASE' or p_transaction->>'status' is distinct from 'SUCCESS' or p_transaction->>'statusCode' is distinct from '0000'
      or jsonb_typeof(p_order->'purchaseCount') is distinct from 'number' or (p_order->>'purchaseCount')::numeric not between 1 and 20
      or (p_order->>'purchaseCount')::numeric<>trunc((p_order->>'purchaseCount')::numeric) then
      return jsonb_build_object('ok',false,'error','successful_purchase_required'); end if;
    count_paid:=(p_order->>'purchaseCount')::integer;
    if p_transaction->>'updatedAt' is null or p_transaction->>'updatedAt' !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$' then
      return jsonb_build_object('ok',false,'error','invalid_paid_timestamp'); end if;
    bank_paid_at:=(p_transaction->>'updatedAt')::timestamptz;
    if bank_paid_at<c.created_at-interval '1 minute' or bank_paid_at>now()+interval '5 minutes' then return jsonb_build_object('ok',false,'error','invalid_paid_timestamp'); end if;
    insert into public.raiaccept_verified_payments(environment,merchant_account_id,transaction_id,order_id,amount_cents,currency,paid_at)
      values(c.environment,c.merchant_account_id,tx_id,p_order_id,c.amount_cents,c.currency,bank_paid_at) on conflict do nothing;
    select * into payment from public.raiaccept_verified_payments where environment=c.environment and merchant_account_id=c.merchant_account_id and transaction_id=tx_id;
    if payment.order_id is distinct from p_order_id then return jsonb_build_object('ok',false,'error','provider_transaction_duplicate'); end if;
    if o.provider_transaction_id is not null and o.provider_transaction_id<>tx_id then reason:='multiple_successful_purchases'; end if;
    if count_paid<>1 then reason:='multiple_successful_purchases'; end if;
    update public.credit_orders set status='paid',paid_at=coalesce(credit_orders.paid_at,bank_paid_at),provider_transaction_id=coalesce(provider_transaction_id,tx_id) where id=p_order_id;
    if (c.payment_state='fully_refunded' and bank_status<>'FULLY_REFUNDED') or (c.payment_state='partially_refunded' and bank_status='PAID') then
      reason:='bank_state_regression';
    else
      update public.raiaccept_checkouts set payment_state=case bank_status when 'PAID' then 'paid' when 'PARTIALLY_REFUNDED' then 'partially_refunded' else 'fully_refunded' end where order_id=p_order_id;
    end if;
    if bank_status<>'PAID' then reason:='refund_detected'; end if;
    if c.fulfillment_state='manual_review' and reason is null then reason:=coalesce(c.review_reason,'manual_review'); end if;
    if c.fulfillment_state<>'fulfilled' and reason is null then
      perform 1 from public.profiles where id=uid for update;
      if not found then reason:='profile_missing'; end if;
      select m2.*,cp.renewal_window_days into m from public.memberships m2 join public.commerce_plans cp on cp.id=m2.plan_id
        where m2.user_id=uid order by m2.expires_at desc limit 1;
      if m.id is not null then effective:=public.membership_effective_status(m.expires_at,m.renewal_window_days,m.plan_id,m.suspended,now()); end if;
      if reason is not null then null;
      elsif exists(select 1 from public.memberships where user_id=uid and payment_provider='paddle' and (paddle_status<>'canceled' or expires_at>now()))
        and o.order_kind<>'topup' then reason:='paddle_managed_subscription';
      elsif exists(select 1 from public.profiles where id=uid and credits::bigint+c.credits>2147483647) then reason:='credit_balance_overflow';
      elsif o.order_kind='topup' then
        if effective not in ('ACTIVE','RENEWAL_WINDOW','BUSINESS_ACTIVE') or m.suspended then reason:='topup_plan_changed'; else granted_membership_id:=m.id; end if;
      elsif o.order_kind='plan_purchase' then
        if (m.id is not null and m.expires_at>now()) or effective in ('ACTIVE','RENEWAL_WINDOW','BUSINESS_ACTIVE') then reason:='plan_already_active'; end if;
      elsif o.order_kind in ('plan_upgrade','plan_renewal') then
        if m.id is distinct from c.expected_membership_id or m.expires_at is distinct from c.expected_membership_expires_at
          or m.plan_id is distinct from (case when o.order_kind='plan_upgrade' then 'standard' else c.commercial_snapshot->>'plan_id' end)
          or m.suspended or m.renewal_mode<>'manual' then reason:='membership_changed';
        elsif o.order_kind='plan_upgrade' and effective not in ('ACTIVE','RENEWAL_WINDOW') then reason:='upgrade_expired';
        elsif o.order_kind='plan_renewal' and (bank_paid_at>m.expires_at or bank_paid_at<m.expires_at-(c.commercial_snapshot->>'renewal_window_days')::integer*interval '1 day'
          or m.cycle_renewal_fulfilled_at>=m.expires_at-(c.commercial_snapshot->>'renewal_window_days')::integer*interval '1 day') then reason:='renewal_cycle_changed';
        else granted_membership_id:=m.id; end if;
      else reason:='unsupported_order_kind'; end if;
      if o.order_kind<>'topup' then
        days:=(c.commercial_snapshot->>'duration_days')::integer;
        if days is null or days not between 1 and 366 or c.commercial_snapshot->>'plan_id' is null or c.commercial_snapshot->>'plan_id' not in ('standard','pro') then reason:='invalid_frozen_plan'; end if;
        if o.order_kind='plan_renewal' and m.expires_at+days*interval '1 day'<=now() then reason:='renewal_processing_delayed'; end if;
      end if;
      if reason is null then
        if o.order_kind='plan_purchase' then
          new_expires:=now()+days*interval '1 day';
          insert into public.memberships(user_id,plan_id,started_at,expires_at,renewal_mode,renewed_from_id,payment_provider)
            values(uid,c.commercial_snapshot->>'plan_id',now(),new_expires,'manual',m.id,'raiaccept') returning id into granted_membership_id;
        elsif o.order_kind='plan_renewal' then
          new_expires:=m.expires_at+days*interval '1 day';
          update public.memberships set expires_at=new_expires,cycle_renewal_fulfilled_at=now(),payment_provider='raiaccept',updated_at=now() where id=granted_membership_id;
        elsif o.order_kind='plan_upgrade' then
          update public.memberships set plan_id='pro',payment_provider='raiaccept',updated_at=now() where id=granted_membership_id;
        end if;
        update public.profiles set credits=credits+c.credits,
          maro_plan=case when o.order_kind='topup' then maro_plan else c.commercial_snapshot->>'plan_id' end where id=uid returning credits into new_balance;
        insert into public.credit_transactions(user_id,type,amount,balance_after,idempotency_key,order_id,membership_id,metadata)
          values(uid,o.order_kind,c.credits,new_balance,'raiaccept:'||c.environment||':'||tx_id,p_order_id,granted_membership_id,
            jsonb_build_object('provider','raiaccept','environment',c.environment,'provider_transaction_id',tx_id,'merchant_reference',c.merchant_reference,'frozen_snapshot',c.commercial_snapshot));
        update public.credit_orders set membership_id=granted_membership_id where id=p_order_id;
        update public.raiaccept_checkouts set fulfillment_state='fulfilled',holds_membership=false where order_id=p_order_id;
        insert into public.raiaccept_receipt_jobs(order_id) values(p_order_id) on conflict do nothing;
      end if;
    end if;
    if reason is not null then
      update public.raiaccept_checkouts set fulfillment_state=case when fulfillment_state='fulfilled' then fulfillment_state else 'manual_review' end,
        review_reason=reason,holds_membership=case when bank_status='FULLY_REFUNDED' then false else holds_membership end where order_id=p_order_id;
    end if;
  elsif bank_status in ('FAILED','CANCELED','ABANDONED') then
    if c.payment_state in ('paid','partially_refunded','fully_refunded') then reason:='bank_state_regression';
    else
      update public.raiaccept_checkouts set payment_state='unpaid',holds_membership=false where order_id=p_order_id;
      update public.credit_orders set status=case when bank_status='FAILED' then 'failed' else 'canceled' end,cancel_reason='bank_verified_'||lower(bank_status) where id=p_order_id and status<>'paid';
    end if;
  elsif c.payment_state in ('paid','partially_refunded','fully_refunded') then reason:='bank_state_regression';
  end if;
  if reason='bank_state_regression' then update public.raiaccept_checkouts set review_reason=reason where order_id=p_order_id; end if;
  update public.raiaccept_checkouts set verification_lease_id=null,
    next_check_at=case when payment_state in ('paid','partially_refunded','fully_refunded') then now()+interval '6 hours'
      when payment_state='unpaid' then null else now()+interval '2 minutes' end,updated_at=now() where order_id=p_order_id returning * into c;
  update public.raiaccept_verification_queue set processed_version=greatest(processed_version,c.verification_queue_version) where order_id=p_order_id;
  return jsonb_build_object('ok',true,'payment_state',c.payment_state,'fulfillment_state',c.fulfillment_state,'review_reason',c.review_reason);
end;
$function$;
revoke all on function public.apply_raiaccept_verification(uuid,uuid,jsonb,jsonb) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.bump_creation_like(p_user uuid, p_creation uuid, p_add boolean)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  new_count integer;
begin
  if p_add then
    insert into public.creation_likes (user_id, creation_id)
    values (p_user, p_creation)
    on conflict do nothing;
    if found then
      update public.public_creations set like_count = like_count + 1 where id = p_creation
      returning like_count into new_count;
    else
      select like_count into new_count from public.public_creations where id = p_creation;
    end if;
  else
    delete from public.creation_likes where user_id = p_user and creation_id = p_creation;
    if found then
      update public.public_creations set like_count = greatest(0, like_count - 1) where id = p_creation
      returning like_count into new_count;
    else
      select like_count into new_count from public.public_creations where id = p_creation;
    end if;
  end if;
  return coalesce(new_count, 0);
end;
$function$;
revoke all on function public.bump_creation_like(uuid,uuid,boolean) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.bump_prompt_use(p_prompt uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  update public.maro_prompts set use_count = use_count + 1 where id = p_prompt;
$function$;
revoke all on function public.bump_prompt_use(uuid) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.cancel_credit_order(p_order_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if exists(select 1 from public.credit_orders where id=p_order_id and provider='raiaccept') then return jsonb_build_object('ok',false,'error','raiaccept_bank_verification_required'); end if;
  if exists(select 1 from public.credit_orders where id=p_order_id and provider='paddle') then return jsonb_build_object('ok',false,'error','paddle_managed_payment'); end if;
  return public.cancel_non_paddle_credit_order(p_order_id,p_reason);
end;
$function$;
revoke all on function public.cancel_credit_order(uuid,text) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.cancel_non_paddle_credit_order(p_order_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  o record;
begin
  select * into o from public.credit_orders where id = p_order_id for update;
  if o.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if o.status = 'paid' then
    return jsonb_build_object('ok', false, 'error', 'already_paid');
  end if;

  if o.status = 'cancelled' then
    return jsonb_build_object('ok', true, 'already', true, 'order_id', o.id);
  end if;

  update public.credit_orders
  set status = 'cancelled',
      cancel_reason = coalesce(p_reason, cancel_reason)
  where id = o.id;

  return jsonb_build_object('ok', true, 'order_id', o.id);
end;
$function$;
revoke all on function public.cancel_non_paddle_credit_order(uuid,text) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_scope text, p_scope_key text, p_limit integer, p_window_seconds integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  cnt integer;
  oldest timestamptz;
  retry_after integer;
begin
  delete from public.rate_limit_events
  where scope = p_scope
    and scope_key = p_scope_key
    and created_at < now() - (p_window_seconds || ' seconds')::interval;

  select count(*), min(created_at) into cnt, oldest
  from public.rate_limit_events
  where scope = p_scope and scope_key = p_scope_key;

  if cnt >= p_limit then
    retry_after := greatest(1, extract(epoch from (oldest + (p_window_seconds || ' seconds')::interval - now()))::integer);
    return jsonb_build_object('allowed', false, 'retry_after', retry_after);
  end if;

  insert into public.rate_limit_events (scope, scope_key) values (p_scope, p_scope_key);
  return jsonb_build_object('allowed', true, 'retry_after', 0);
end;
$function$;
revoke all on function public.check_rate_limit(text,text,integer,integer) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.claim_raiaccept_receipts(p_environment text, p_merchant text, p_limit integer DEFAULT 3)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r public.raiaccept_receipt_jobs%rowtype;jobs jsonb:='[]'::jsonb;
begin
  if auth.role() is distinct from 'service_role' then return jsonb_build_object('ok',false,'error','forbidden');end if;
  if p_limit is null or p_limit not between 1 and 5 then return jsonb_build_object('ok',false,'error','invalid_request');end if;
  -- Resend retains idempotency keys for 24h. Stop automatic delivery before that window expires.
  update public.raiaccept_receipt_jobs set state='failed',next_attempt_at=null,last_error='delivery_requires_review',lease_id=null
    where state<>'sent' and first_attempt_at<now()-interval '23 hours';
  for r in select r2.* from public.raiaccept_receipt_jobs r2 join public.raiaccept_checkouts c on c.order_id=r2.order_id
    where c.environment=p_environment and c.merchant_account_id=p_merchant and c.payment_state='paid' and c.fulfillment_state='fulfilled'
      and (r2.state in ('pending','failed') or (r2.state='sending' and r2.lease_started_at<now()-interval '2 minutes'))
      and r2.next_attempt_at<=now() and (r2.first_attempt_at is null or r2.first_attempt_at>=now()-interval '23 hours')
    order by r2.created_at limit p_limit for update of r2 skip locked
  loop
    update public.raiaccept_receipt_jobs set state='sending',lease_id=gen_random_uuid(),lease_started_at=now(),attempts=attempts+1
      where order_id=r.order_id returning * into r;
    jobs:=jobs||jsonb_build_array(to_jsonb(r));
  end loop;
  return jsonb_build_object('ok',true,'jobs',jobs);
end;$function$;
revoke all on function public.claim_raiaccept_receipts(text,text,integer) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.claim_raiaccept_verifications(p_environment text, p_merchant text, p_limit integer DEFAULT 10, p_order_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare c public.raiaccept_checkouts%rowtype; q public.raiaccept_verification_queue%rowtype; jobs jsonb:='[]'::jsonb;
begin
  if auth.role() is distinct from 'service_role' then return jsonb_build_object('ok',false,'error','forbidden'); end if;
  if p_environment is null or p_environment not in ('sandbox','production') or p_limit is null or p_limit not between 1 and 20 then
    return jsonb_build_object('ok',false,'error','invalid_request'); end if;
  for c in select c2.* from public.raiaccept_checkouts c2 left join public.raiaccept_verification_queue q2 on q2.order_id=c2.order_id
    where c2.environment=p_environment and c2.merchant_account_id=p_merchant and c2.creation_state in ('created','creation_unknown','creating')
      and (p_order_id is null or c2.order_id=p_order_id)
      and (c2.next_check_at<=now() or q2.version>q2.processed_version)
      and (c2.verification_lease_id is null or c2.verification_lease_started_at<now()-interval '2 minutes')
      and not(c2.creation_state='creating' and c2.lease_started_at>now()-interval '2 minutes')
    order by coalesce(c2.next_check_at,q2.last_notified_at) limit p_limit for update of c2 skip locked
  loop
    select * into q from public.raiaccept_verification_queue where order_id=c.order_id;
    update public.raiaccept_checkouts set verification_lease_id=gen_random_uuid(),verification_lease_started_at=now(),
      verification_queue_version=coalesce(q.version,0),verification_attempts=verification_attempts+1,
      creation_state=case when creation_state='creating' then 'creation_unknown' else creation_state end,updated_at=now()
      where order_id=c.order_id returning * into c;
    jobs:=jobs||jsonb_build_array(to_jsonb(c)||jsonb_build_object('provider_order_id',coalesce(c.provider_order_id,q.candidate_provider_order_id)));
  end loop;
  return jsonb_build_object('ok',true,'jobs',jobs);
end;
$function$;
revoke all on function public.claim_raiaccept_verifications(text,text,integer,uuid) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.count_active_jobs(p_user uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select count(*)::integer from public.generation_jobs
  where status in ('reserved', 'processing')
    and (p_user is null or user_id = p_user);
$function$;
revoke all on function public.count_active_jobs(uuid) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.create_paddle_order(p_user uuid, p_item text, p_price text, p_billing jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  o public.credit_orders%rowtype;
  cp public.commerce_plans%rowtype;
  tp public.commerce_topups%rowtype;
  n integer; amount integer; days integer; label text; email_address text; kind text;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 742));
  if p_price !~ '^pri_[a-z0-9]{26}$' or (p_billing->>'legalConsent')::boolean is distinct from true then
    raise exception 'invalid_checkout';
  end if;
  select email into email_address from auth.users where id = p_user;
  if email_address is null then raise exception 'unknown_user'; end if;
  if p_item in ('standard', 'pro') then
    if exists(select 1 from public.memberships where user_id = p_user and
      (expires_at > now() or (payment_provider = 'paddle' and paddle_status <> 'canceled'))) then
      raise exception 'plan_already_active_or_managed';
    end if;
    select * into cp from public.commerce_plans where id = p_item and enabled and not contact_only;
    if cp.id is null or cp.currency <> 'EUR' then raise exception 'invalid_plan'; end if;
    n := cp.included_credits; amount := cp.price_cents; days := cp.duration_days;
    label := cp.display_name; kind := 'plan_purchase';
  else
    if not exists(select 1 from public.memberships where user_id = p_user and expires_at > now()
      and not suspended and (payment_provider is distinct from 'paddle' or paddle_status = 'active')) then
      raise exception 'topup_requires_active_plan';
    end if;
    select * into tp from public.commerce_topups where id = p_item and enabled;
    if tp.id is null or tp.currency <> 'EUR' then raise exception 'invalid_topup'; end if;
    n := tp.credits; amount := tp.price_cents; label := p_item; kind := 'topup';
  end if;
  if n <= 0 or amount <= 0 then raise exception 'invalid_catalog'; end if;
  select * into o from public.credit_orders where user_id = p_user and provider = 'paddle'
    and status = 'pending' and (item_id = p_item or (kind = 'plan_purchase' and order_kind = kind))
    order by created_at desc limit 1 for update;
  if o.id is not null then
    if o.item_id <> p_item then raise exception 'paddle_checkout_already_pending'; end if;
    if o.provider_transaction_id is not null then
      return jsonb_build_object('created', false, 'order', to_jsonb(o));
    end if;
    if o.created_at > now() - interval '10 minutes' then raise exception 'paddle_checkout_in_progress'; end if;
    -- No transaction was bound or returned to the browser. Retire an interrupted
    -- reservation; never retire a bound checkout that can still be paid.
    update public.credit_orders set status = 'failed' where id = o.id;
  end if;
  insert into public.credit_orders(user_id, user_email, credits, amount_cents, currency,
    status, provider, item_type, item_id, order_kind, commercial_snapshot, billing_snapshot, paddle_price_id)
  values(p_user, email_address, n, amount, 'EUR', 'pending', 'paddle',
    case when kind = 'topup' then 'topup' else 'plan' end, p_item, kind,
    jsonb_build_object('captured_at', now(), 'order_kind', kind, 'plan_id', cp.id,
      'plan_name_snapshot', label, 'credits_snapshot', n, 'price_cents', amount,
      'currency', 'EUR', 'duration_days', days, 'config_version', 'paddle_v1'),
    p_billing || jsonb_build_object('email', email_address), p_price)
  returning * into o;
  return jsonb_build_object('created', true, 'order', to_jsonb(o));
end;
$function$;
revoke all on function public.create_paddle_order(uuid,text,text,jsonb) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.enforce_workspace_entitlement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  ws_count integer;
  ws_limit integer;
begin
  select count(*)::integer into ws_count
  from public.workspaces
  where owner_id = new.owner_id;

  ws_limit := public.resolve_workspace_limit(new.owner_id);

  if ws_count >= ws_limit then
    raise exception 'WORKSPACE_LIMIT'
      using errcode = 'P0001',
            hint = 'workspace entitlement limit reached';
  end if;

  return new;
end;
$function$;
revoke all on function public.enforce_workspace_entitlement() from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.enqueue_raiaccept_verification(p_environment text, p_merchant text, p_provider_order_id text, p_reference text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare c public.raiaccept_checkouts%rowtype;
begin
  if auth.role() is distinct from 'service_role' then return jsonb_build_object('ok',false,'error','forbidden'); end if;
  if p_provider_order_id is null or p_provider_order_id !~ '^[A-Za-z0-9_-]{1,150}$' then return jsonb_build_object('ok',false,'error','invalid_request'); end if;
  select * into c from public.raiaccept_checkouts where environment=p_environment and merchant_account_id=p_merchant
    and merchant_reference=p_reference and (provider_order_id=p_provider_order_id or provider_order_id is null);
  if not found then return jsonb_build_object('ok',true,'known',false); end if;
  insert into public.raiaccept_verification_queue(order_id,candidate_provider_order_id) values(c.order_id,p_provider_order_id)
    on conflict(order_id) do update set version=raiaccept_verification_queue.version+1,
      candidate_provider_order_id=excluded.candidate_provider_order_id,last_notified_at=now();
  return jsonb_build_object('ok',true,'known',true);
end;
$function$;
revoke all on function public.enqueue_raiaccept_verification(text,text,text,text) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.ensure_default_workspace(p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_ws_id text;
begin
  select w.id into v_ws_id
  from public.workspaces w
  where w.owner_id = p_user_id
  order by w.sort_order asc, w.created_at asc
  limit 1;

  if v_ws_id is not null then
    update public.profiles
    set active_workspace_id = coalesce(active_workspace_id, v_ws_id)
    where id = p_user_id;
    return v_ws_id;
  end if;

  v_ws_id := 'ws_' || replace(gen_random_uuid()::text, '-', '');

  insert into public.workspaces (id, owner_id, name, icon_url, sort_order)
  values (v_ws_id, p_user_id, 'Maro Workspace #1', null, 0);

  update public.profiles
  set active_workspace_id = v_ws_id
  where id = p_user_id;

  return v_ws_id;
end;
$function$;
revoke all on function public.ensure_default_workspace(uuid) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.fail_raiaccept_verification(p_order_id uuid, p_lease_id uuid, p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare c public.raiaccept_checkouts%rowtype;
begin
  if auth.role() is distinct from 'service_role' then return jsonb_build_object('ok',false,'error','forbidden'); end if;
  select * into c from public.raiaccept_checkouts where order_id=p_order_id for update;
  if not found or p_lease_id is null or c.verification_lease_id is distinct from p_lease_id then return jsonb_build_object('ok',false,'error','lease_mismatch'); end if;
  if p_code is null or p_code !~ '^[a-z0-9_]{1,100}$' then return jsonb_build_object('ok',false,'error','invalid_error'); end if;
  update public.raiaccept_checkouts set last_error=p_code,verification_lease_id=null,next_check_at=now()+
    case when provider_order_id is null then interval '6 hours' else interval '2 minutes' end,updated_at=now() where order_id=p_order_id;
  update public.raiaccept_verification_queue set processed_version=greatest(processed_version,c.verification_queue_version) where order_id=p_order_id;
  return jsonb_build_object('ok',true);
end;
$function$;
revoke all on function public.fail_raiaccept_verification(uuid,uuid,text) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.fail_v1_image_job(p_job_id uuid, p_reason text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare j public.generation_jobs;
begin
  if p_reason not in ('provider_failed','provider_output_invalid','storage_failed','history_failed','execution_trace_unavailable','execution_interrupted') then raise exception 'invalid_failure_reason'; end if;
  select * into j from public.generation_jobs where id=p_job_id for update;
  if j.id is null or j.metadata->>'v1_durable' is distinct from 'true' then return 'invalid_state'; end if;
  if j.status='completed' then return 'already_finalized'; end if;
  if j.status in ('failed','cancelled') then return 'released'; end if;
  if exists(select 1 from public.generations where job_id=p_job_id) then return 'settlement_pending'; end if;
  update public.generation_jobs set error=p_reason,metadata=jsonb_set(metadata,'{v1_lifecycle}',coalesce(metadata->'v1_lifecycle','{}'::jsonb)||jsonb_build_object('failure',p_reason)) where id=p_job_id;
  if public.release_credit_reserve(p_job_id,'fail-'||p_job_id) then return 'released'; end if;
  return 'reconciliation_pending';
end $function$;
revoke all on function public.fail_v1_image_job(uuid,text) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.finalize_credit_charge(p_job_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare j public.generation_jobs; r public.credit_transactions; bal integer;
begin
  select * into j from public.generation_jobs where id=p_job_id for update;
  if j.id is null then return false; end if;
  if exists(select 1 from public.credit_transactions where job_id=p_job_id and type='charge') then
    select * into r from public.credit_transactions where job_id=p_job_id and type='charge';
    return j.status='completed' and j.credits_charged=r.amount and r.user_id=j.user_id and j.credits_reserved=0
      and (j.metadata->>'v1_durable' is distinct from 'true' or (public.v1_image_success_evidence(p_job_id)
        and exists(select 1 from public.generations where job_id=j.id and credits_spent=r.amount)));
  end if;
  if j.status not in ('reserved','processing') or exists(select 1 from public.credit_transactions where job_id=p_job_id and type in ('release','refund')) then return false; end if;
  select * into r from public.credit_transactions where job_id=p_job_id and type='reserve' order by created_at limit 1;
  if r.id is null or r.user_id <> j.user_id or r.amount <> j.credits_reserved then return false; end if;
  if j.metadata->>'v1_durable'='true' then
    if not public.v1_image_success_evidence(p_job_id) or r.amount is distinct from (j.metadata#>>'{v1_request,model,customerCredits}')::integer then return false; end if;
    update public.generations set credits_spent=r.amount where job_id=j.id;
  end if;
  update public.profiles set credits_reserved=credits_reserved-r.amount where id=r.user_id and credits_reserved>=r.amount returning credits into bal;
  if not found then raise exception 'reservation_accounting_mismatch'; end if;
  insert into public.credit_transactions(user_id,job_id,type,amount,balance_after) values(r.user_id,j.id,'charge',r.amount,bal);
  update public.generation_jobs set credits_reserved=0,credits_charged=r.amount,status='completed',finished_at=now(),error=null,
    metadata=case when metadata->>'v1_durable'='true' then jsonb_set(metadata,'{v1_lifecycle,phase}','"completed"') else metadata end where id=j.id;
  return true;
end $function$;
revoke all on function public.finalize_credit_charge(uuid) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.finish_raiaccept_receipt(p_order_id uuid, p_lease uuid, p_sent boolean, p_message_id text DEFAULT NULL::text, p_error text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r public.raiaccept_receipt_jobs%rowtype;
begin
  if auth.role() is distinct from 'service_role' then return jsonb_build_object('ok',false,'error','forbidden');end if;
  select * into r from public.raiaccept_receipt_jobs where order_id=p_order_id for update;
  if not found or p_lease is null or r.lease_id is distinct from p_lease or r.state<>'sending' then return jsonb_build_object('ok',false,'error','lease_mismatch');end if;
  if p_sent is null or (not p_sent and (p_error is null or p_error !~ '^[a-z0-9_]{1,100}$')) then return jsonb_build_object('ok',false,'error','invalid_request');end if;
  update public.raiaccept_receipt_jobs set state=case when p_sent then 'sent' else 'failed' end,lease_id=null,
    sent_at=case when p_sent then now() else sent_at end,provider_message_id=case when p_sent then left(p_message_id,200) else provider_message_id end,
    last_error=case when p_sent then null else p_error end,
    next_attempt_at=case when p_sent or attempts>=10 then null else now()+interval '2 minutes' end where order_id=p_order_id;
  return jsonb_build_object('ok',true);
end;$function$;
revoke all on function public.finish_raiaccept_receipt(uuid,uuid,boolean,text,text) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.fulfill_commerce_order(p_order_id uuid, p_provider_transaction_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare o public.credit_orders%rowtype;
begin
  select * into o from public.credit_orders where id=p_order_id;
  if o.provider='raiaccept' then return jsonb_build_object('ok',false,'error','raiaccept_verified_payment_required'); end if;
  if o.provider='paddle' then return jsonb_build_object('ok',false,'error','paddle_webhook_required'); end if;
  perform pg_advisory_xact_lock(hashtextextended(o.user_id::text,742));
  if o.order_kind in ('plan_purchase','plan_renewal','plan_upgrade','business_payment') and exists(
    select 1 from public.memberships where user_id=o.user_id and payment_provider='paddle' and (paddle_status<>'canceled' or expires_at>now())
  ) then return jsonb_build_object('ok',false,'error','paddle_managed_subscription'); end if;
  return public.fulfill_non_paddle_commerce_order(p_order_id,p_provider_transaction_id);
end;
$function$;
revoke all on function public.fulfill_commerce_order(uuid,text) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.fulfill_credit_order(p_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  return public.fulfill_commerce_order(p_order_id, null);
end;
$function$;
revoke all on function public.fulfill_credit_order(uuid) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.fulfill_non_paddle_commerce_order(p_order_id uuid, p_provider_transaction_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  o record;
  m record;
  cp record;
  tp record;
  new_balance integer;
  idem text;
  eff_status text;
  renewal_days integer;
  new_expires timestamptz;
  upgrade_from text;
  pro_plan record;
  std_plan record;
  new_membership_id uuid;
begin
  select * into o from public.credit_orders where id = p_order_id for update;
  if o.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if o.status = 'paid' then
    return jsonb_build_object('ok', true, 'already', true, 'order_id', o.id);
  end if;

  if o.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'invalid_status', 'status', o.status);
  end if;

  if o.user_id is null then
    return jsonb_build_object('ok', false, 'error', 'no_user');
  end if;

  if p_provider_transaction_id is not null then
    if exists (
      select 1 from public.credit_orders
      where provider_transaction_id = p_provider_transaction_id
        and status = 'paid'
        and id <> o.id
    ) then
      return jsonb_build_object('ok', false, 'error', 'provider_tx_duplicate');
    end if;
  end if;

  idem := coalesce(
    p_provider_transaction_id,
    'purchase-' || o.id::text
  );

  if exists (
    select 1 from public.credit_transactions
    where user_id = o.user_id and idempotency_key = idem
      and type in ('plan_purchase', 'plan_renewal', 'plan_upgrade', 'topup', 'manual_adjustment')
  ) then
    update public.credit_orders
    set status = 'paid',
        paid_at = coalesce(paid_at, now()),
        provider = coalesce(provider, 'test'),
        provider_transaction_id = coalesce(provider_transaction_id, p_provider_transaction_id)
    where id = o.id;
    select credits into new_balance from public.profiles where id = o.user_id;
    return jsonb_build_object('ok', true, 'already', true, 'order_id', o.id, 'balance', new_balance);
  end if;

  -- Load current membership (latest by expires_at)
  select m2.*, cp2.renewal_window_days as plan_renewal_window_days
  into m
  from public.memberships m2
  join public.commerce_plans cp2 on cp2.id = m2.plan_id
  where m2.user_id = o.user_id
  order by m2.expires_at desc
  limit 1;

  if m.id is not null then
    eff_status := public.membership_effective_status(
      m.expires_at, m.plan_renewal_window_days, m.plan_id, m.suspended, now()
    );
  else
    eff_status := 'NO_PLAN';
  end if;

  -- -------------------------------------------------------------------------
  -- TOPUP
  -- -------------------------------------------------------------------------
  if o.order_kind = 'topup' then
    if eff_status not in ('ACTIVE', 'RENEWAL_WINDOW', 'BUSINESS_ACTIVE') then
      return jsonb_build_object('ok', false, 'error', 'topup_requires_active_plan');
    end if;

    select * into tp from public.commerce_topups where id = o.item_id and enabled = true;
    if tp.id is null then
      return jsonb_build_object('ok', false, 'error', 'invalid_topup');
    end if;

    update public.profiles
    set credits = credits + o.credits
    where id = o.user_id
    returning credits into new_balance;

    insert into public.credit_transactions (
      user_id, type, amount, balance_after, idempotency_key, order_id, membership_id, metadata
    ) values (
      o.user_id, 'topup', o.credits, new_balance, idem, o.id, m.id,
      jsonb_build_object('item_id', o.item_id, 'order_kind', o.order_kind)
    );

  -- -------------------------------------------------------------------------
  -- PLAN UPGRADE (standard -> pro)
  -- -------------------------------------------------------------------------
  elsif o.order_kind = 'plan_upgrade' then
    if eff_status not in ('ACTIVE', 'RENEWAL_WINDOW') or m.plan_id <> 'standard' then
      return jsonb_build_object('ok', false, 'error', 'upgrade_not_eligible');
    end if;

    select * into std_plan from public.commerce_plans where id = 'standard';
    select * into pro_plan from public.commerce_plans where id = 'pro';

    update public.profiles
    set credits = credits + o.credits,
        maro_plan = 'pro'
    where id = o.user_id
    returning credits into new_balance;

    update public.memberships
    set plan_id = 'pro',
        updated_at = now()
    where id = m.id;

    insert into public.credit_transactions (
      user_id, type, amount, balance_after, idempotency_key, order_id, membership_id, metadata
    ) values (
      o.user_id, 'plan_upgrade', o.credits, new_balance, idem, o.id, m.id,
      jsonb_build_object(
        'from_plan', 'standard', 'to_plan', 'pro',
        'order_kind', o.order_kind
      )
    );

  -- -------------------------------------------------------------------------
  -- PLAN RENEWAL
  -- -------------------------------------------------------------------------
  elsif o.order_kind = 'plan_renewal' then
    if eff_status <> 'RENEWAL_WINDOW' then
      return jsonb_build_object('ok', false, 'error', 'renewal_not_available');
    end if;

    if m.cycle_renewal_fulfilled_at is not null
       and m.cycle_renewal_fulfilled_at >= (m.expires_at - (m.plan_renewal_window_days || ' days')::interval) then
      return jsonb_build_object('ok', false, 'error', 'renewal_already_fulfilled');
    end if;

    select * into cp from public.commerce_plans where id = m.plan_id and enabled = true and contact_only = false;
    if cp.id is null then
      return jsonb_build_object('ok', false, 'error', 'invalid_plan');
    end if;

    new_expires := m.expires_at + (cp.duration_days || ' days')::interval;

    update public.profiles
    set credits = credits + o.credits,
        maro_plan = m.plan_id
    where id = o.user_id
    returning credits into new_balance;

    update public.memberships
    set expires_at = new_expires,
        cycle_renewal_fulfilled_at = now(),
        updated_at = now()
    where id = m.id;

    insert into public.credit_transactions (
      user_id, type, amount, balance_after, idempotency_key, order_id, membership_id, metadata
    ) values (
      o.user_id, 'plan_renewal', o.credits, new_balance, idem, o.id, m.id,
      jsonb_build_object('plan_id', m.plan_id, 'new_expires_at', new_expires)
    );

  -- -------------------------------------------------------------------------
  -- PLAN PURCHASE (new or after expiry)
  -- -------------------------------------------------------------------------
  elsif o.order_kind = 'plan_purchase' then
    if eff_status in ('ACTIVE', 'RENEWAL_WINDOW', 'BUSINESS_ACTIVE') then
      return jsonb_build_object('ok', false, 'error', 'plan_already_active');
    end if;

    select * into cp from public.commerce_plans where id = o.item_id and enabled = true and contact_only = false;
    if cp.id is null then
      return jsonb_build_object('ok', false, 'error', 'invalid_plan');
    end if;

    new_expires := now() + (cp.duration_days || ' days')::interval;

    update public.profiles
    set credits = credits + o.credits,
        maro_plan = cp.id
    where id = o.user_id
    returning credits into new_balance;

    insert into public.memberships (
      user_id, plan_id, started_at, expires_at, renewal_mode, renewed_from_id
    ) values (
      o.user_id, cp.id, now(), new_expires, cp.renewal_mode,
      case when m.id is not null then m.id else null end
    )
    returning id into new_membership_id;

    insert into public.credit_transactions (
      user_id, type, amount, balance_after, idempotency_key, order_id, membership_id, metadata
    ) values (
      o.user_id, 'plan_purchase', o.credits, new_balance, idem, o.id, new_membership_id,
      jsonb_build_object('plan_id', cp.id, 'expires_at', new_expires)
    );

  -- -------------------------------------------------------------------------
  -- BUSINESS PAYMENT (admin-configured)
  -- -------------------------------------------------------------------------
  elsif o.order_kind = 'business_payment' then
    select * into cp from public.commerce_plans where id = 'business';

    new_expires := now() + (coalesce((o.commercial_snapshot->>'duration_days')::integer, cp.duration_days) || ' days')::interval;

    update public.profiles
    set credits = credits + o.credits,
        maro_plan = 'business'
    where id = o.user_id
    returning credits into new_balance;

    insert into public.memberships (
      user_id, plan_id, started_at, expires_at, renewal_mode, business_overrides
    ) values (
      o.user_id, 'business', now(), new_expires, 'manual',
      coalesce(o.commercial_snapshot->'business_overrides', '{}'::jsonb)
    )
    returning id into new_membership_id;

    insert into public.credit_transactions (
      user_id, type, amount, balance_after, idempotency_key, order_id, membership_id, metadata
    ) values (
      o.user_id, 'plan_purchase', o.credits, new_balance, idem, o.id, new_membership_id,
      jsonb_build_object('plan_id', 'business', 'order_kind', 'business_payment')
    );

  else
    -- Legacy fallback: treat as old fulfill_credit_order behavior without fort grant
    update public.profiles
    set credits = credits + o.credits
    where id = o.user_id
    returning credits into new_balance;

    insert into public.credit_transactions (
      user_id, type, amount, balance_after, idempotency_key, order_id, metadata
    ) values (
      o.user_id, 'manual_adjustment', o.credits, new_balance, idem, o.id,
      jsonb_build_object('order_id', o.id, 'item_type', o.item_type, 'item_id', o.item_id, 'legacy', true)
    );

    if o.item_type = 'plan' and o.item_id in ('standard', 'pro', 'business') then
      select * into cp from public.commerce_plans where id = o.item_id;
      new_expires := now() + (cp.duration_days || ' days')::interval;
      update public.profiles set maro_plan = o.item_id where id = o.user_id;
      insert into public.memberships (user_id, plan_id, started_at, expires_at)
      values (o.user_id, o.item_id, now(), new_expires);
    end if;
  end if;

  update public.credit_orders
  set status = 'paid',
      paid_at = now(),
      provider = coalesce(provider, 'test'),
      provider_transaction_id = coalesce(p_provider_transaction_id, provider_transaction_id),
      membership_id = coalesce(new_membership_id, membership_id)
  where id = o.id;

  select credits into new_balance from public.profiles where id = o.user_id;

  return jsonb_build_object(
    'ok', true,
    'order_id', o.id,
    'credits', o.credits,
    'balance', new_balance,
    'order_kind', o.order_kind,
    'membership_id', new_membership_id
  );
end;
$function$;
revoke all on function public.fulfill_non_paddle_commerce_order(uuid,text) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_query_trgm$function$;
revoke all on function public.gin_extract_query_trgm(text,internal,smallint,internal,internal,internal,internal) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.gin_extract_value_trgm(text, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_value_trgm$function$;
revoke all on function public.gin_extract_value_trgm(text,internal) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_trgm_consistent$function$;
revoke all on function public.gin_trgm_consistent(internal,smallint,text,integer,internal,internal,internal,internal) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal)
 RETURNS "char"
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_trgm_triconsistent$function$;
revoke all on function public.gin_trgm_triconsistent(internal,smallint,text,integer,internal,internal,internal) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.gtrgm_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_compress$function$;
revoke all on function public.gtrgm_compress(internal) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.gtrgm_consistent(internal, text, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_consistent$function$;
revoke all on function public.gtrgm_consistent(internal,text,smallint,oid,internal) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.gtrgm_decompress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_decompress$function$;
revoke all on function public.gtrgm_decompress(internal) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.gtrgm_distance(internal, text, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_distance$function$;
revoke all on function public.gtrgm_distance(internal,text,smallint,oid,internal) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.gtrgm_in(cstring)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_in$function$;
revoke all on function public.gtrgm_in(cstring) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.gtrgm_options(internal)
 RETURNS void
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE
AS '$libdir/pg_trgm', $function$gtrgm_options$function$;
revoke all on function public.gtrgm_options(internal) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.gtrgm_out(gtrgm)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_out$function$;
revoke all on function public.gtrgm_out(gtrgm) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.gtrgm_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_penalty$function$;
revoke all on function public.gtrgm_penalty(internal,internal,internal) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.gtrgm_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_picksplit$function$;
revoke all on function public.gtrgm_picksplit(internal,internal) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.gtrgm_same(gtrgm, gtrgm, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_same$function$;
revoke all on function public.gtrgm_same(gtrgm,gtrgm,internal) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.gtrgm_union(internal, internal)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_union$function$;
revoke all on function public.gtrgm_union(internal,internal) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.guard_generation_job_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if TG_OP = 'INSERT' and new.idempotency_key is not null then
    perform pg_advisory_xact_lock(hashtextextended(new.user_id::text || ':' || new.idempotency_key, 0));
    if exists(select 1 from public.generation_jobs where user_id = new.user_id and idempotency_key = new.idempotency_key and status in ('pending','reserved','processing','completed')) then
      raise unique_violation using message = 'generation_idempotency_conflict';
    end if;
  elsif TG_OP = 'UPDATE' then
    if old.metadata->>'v1_durable'='true' and (new.user_id<>old.user_id or new.module<>old.module or new.model is distinct from old.model
      or new.metadata->'v1_durable' is distinct from old.metadata->'v1_durable' or new.metadata->'v1_request' is distinct from old.metadata->'v1_request'
      or new.metadata->'canonical_prompt' is distinct from old.metadata->'canonical_prompt') then raise exception 'immutable_v1_snapshot'; end if;
    if old.status in ('completed','failed','cancelled') and (new.status <> old.status or new.credits_charged <> old.credits_charged or new.credits_reserved <> old.credits_reserved) then
      raise exception 'terminal_generation_job';
    end if;
  end if;
  return new;
end $function$;
revoke all on function public.guard_generation_job_transition() from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.guard_logo_wizard_content_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if (tg_op='INSERT' and new.logo_wizard_content is not null)
    or (tg_op='UPDATE' and new.logo_wizard_content is distinct from old.logo_wizard_content) then
    if current_user <> 'service_role' and not exists(select 1 from pg_catalog.pg_roles where rolname=current_user and rolsuper) then
      raise exception 'logo_content_requires_admin_api' using errcode='42501';
    end if;
  end if;
  return new;
end $function$;
revoke all on function public.guard_logo_wizard_content_write() from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_ws_id text;
begin
  insert into public.profiles (id, email, full_name, is_admin, credits)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email = 'erzen@nice.al',
    case when new.email = 'erzen@nice.al' then 100000 else 0 end
  );

  v_ws_id := 'ws_' || replace(gen_random_uuid()::text, '-', '');

  insert into public.workspaces (id, owner_id, name, icon_url, sort_order)
  values (v_ws_id, new.id, 'Maro Workspace #1', null, 0);

  update public.profiles
  set active_workspace_id = v_ws_id
  where id = new.id;

  return new;
end;
$function$;
revoke all on function public.handle_new_user() from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.has_admin_access()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(
    (
      select p.access_role is not null or p.is_admin = true
      from public.profiles p
      where p.id = auth.uid()
    ),
    false
  );
$function$;
revoke all on function public.has_admin_access() from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$function$;
revoke all on function public.is_admin() from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.mark_v1_image_provider_result(p_job_id uuid, p_sha256 text, p_observation jsonb DEFAULT NULL::jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare j public.generation_jobs;
begin
  select * into j from public.generation_jobs where id=p_job_id for update;
  if j.id is null or j.metadata->>'v1_durable' is distinct from 'true' or j.status not in ('reserved','processing') or p_sha256 is null or p_sha256 !~ '^[a-f0-9]{64}$' then return false; end if;
  if j.metadata#>>'{v1_lifecycle,phase}' in ('provider_succeeded','persisted','settlement_pending') then
    return j.metadata#>>'{v1_lifecycle,output_sha256}' = p_sha256;
  end if;
  update public.generation_jobs set metadata=metadata || jsonb_build_object('v1_lifecycle',jsonb_build_object('phase','provider_succeeded','output_sha256',p_sha256,'storage_ref','storage:generations/'||j.user_id||'/'||j.id||'/output.png'),'execution',coalesce(metadata->'execution','{}'::jsonb)||jsonb_build_object('image_provider',p_observation)) where id=p_job_id;
  return true;
end $function$;
revoke all on function public.mark_v1_image_provider_result(uuid,text,jsonb) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.maro_account_policy(p_user uuid DEFAULT auth.uid(), p_workspace text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare w record;
begin
  if p_user is null or (coalesce(auth.role(),'') <> 'service_role' and auth.uid() is distinct from p_user) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if p_workspace is not null and not exists(select 1 from public.workspaces where id=p_workspace and owner_id=p_user) then
    raise exception 'workspace_not_found' using errcode = '42501';
  end if;
  perform public.maro_refresh_brain_retention(p_user);
  select brain_reset_at, brain_retention_anchor_at into w from public.workspaces where id=p_workspace and owner_id=p_user;
  return jsonb_build_object('brainAccess',public.maro_active_plan(p_user) is not null,
    'brainResetAt',w.brain_reset_at,'brainDeleteAt',w.brain_retention_anchor_at + interval '60 days',
    'usedBytes',public.maro_storage_used_internal(p_user),'limitBytes',public.maro_storage_limit_internal(p_user));
end;
$function$;
revoke all on function public.maro_account_policy(uuid,text) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.maro_active_plan(p_user uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select plan_id from public.memberships
  where user_id = p_user and started_at <= now() and expires_at > now()
    and not suspended and plan_id in ('standard', 'pro', 'business')
  order by expires_at desc limit 1;
$function$;
revoke all on function public.maro_active_plan(uuid) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.maro_brain_allowed()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.maro_active_plan(auth.uid()) is not null;
$function$;
revoke all on function public.maro_brain_allowed() from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.maro_enforce_account_storage_quota()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'storage'
AS $function$
declare owner_user uuid; quota_bytes bigint; old_bytes bigint := 0; new_bytes bigint := 0;
begin
  owner_user := public.maro_storage_owner(new.bucket_id,new.name,new.user_metadata);
  if owner_user is null then return new; end if;
  if new.bucket_id = 'generations' and new.name like owner_user::text || '/workspace-assets/%'
     and public.maro_active_plan(owner_user) is null then
    raise exception 'brain_plan_required' using errcode = '42501';
  end if;
  if (new.metadata->>'size') ~ '^[0-9]+$' then new_bytes := (new.metadata->>'size')::bigint; end if;
  if tg_op = 'UPDATE' and public.maro_storage_owner(old.bucket_id,old.name,old.user_metadata) = owner_user
     and (old.metadata->>'size') ~ '^[0-9]+$' then old_bytes := (old.metadata->>'size')::bigint; end if;
  if new_bytes <= old_bytes then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner_user::text,8647));
  quota_bytes := public.maro_storage_limit_internal(owner_user);
  -- AFTER includes the actual object and works for INSERT ... ON CONFLICT updates.
  -- VOLATILE obtains a fresh READ COMMITTED snapshot after the account lock.
  if quota_bytes is not null and public.maro_storage_used_internal(owner_user) > quota_bytes then
    raise exception 'storage_quota_exceeded' using errcode = 'P0001';
  end if;
  return new;
end;
$function$;
revoke all on function public.maro_enforce_account_storage_quota() from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.maro_generation_conversation_metadata()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare snapshot jsonb;
begin
  if new.kind <> 'image' then return new; end if;
  select metadata->'v1_request' into snapshot from public.generation_jobs
    where id=new.job_id and user_id=new.user_id;
  if snapshot is not null then
    if snapshot->>'userId' is distinct from new.user_id::text or
       nullif(snapshot->>'workspaceId','') is distinct from new.workspace_id then
      raise exception 'invalid_conversation_owner';
    end if;
    new.conversation_id := coalesce(nullif(snapshot->>'conversationId','')::uuid, new.id);
    select coalesce(array_agg(value->>'id'),array[]::text[]) into new.input_refs
      from jsonb_array_elements(coalesce(snapshot->'references','[]'::jsonb));
    new.logo_wizard := snapshot->'logoWizard';
    new.brain := coalesce((snapshot->>'useBrain')::boolean,false);
  else
    new.conversation_id := coalesce(new.conversation_id,new.id);
  end if;
  return new;
end $function$;
revoke all on function public.maro_generation_conversation_metadata() from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.maro_guard_brain_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if current_setting('maro.brain_retention', true) = 'on' then return new; end if;
  if tg_op = 'INSERT' then
    new.brain_reset_at := null;
    select max(expires_at) into new.brain_retention_anchor_at from public.memberships where user_id = new.owner_id;
    new.brain_retention_anchor_at := coalesce(new.brain_retention_anchor_at, now());
    if new.brain_profile <> '{}'::jsonb and public.maro_active_plan(new.owner_id) is null then
      raise exception 'brain_plan_required' using errcode = '42501';
    end if;
    return new;
  end if;
  -- Workspace rename, icons, and other workspace settings remain independent.
  new.brain_retention_anchor_at := old.brain_retention_anchor_at;
  new.brain_reset_at := old.brain_reset_at;
  if new.brain_profile is distinct from old.brain_profile then
    if public.maro_active_plan(new.owner_id) is null then
      raise exception 'brain_plan_required' using errcode = '42501';
    end if;
    -- A stale editor must refresh after a retention reset before writing again.
    if old.brain_retention_anchor_at + interval '60 days' <= now() then
      raise exception 'brain_refresh_required' using errcode = '40001';
    end if;
    select expires_at into new.brain_retention_anchor_at from public.memberships
      where user_id = new.owner_id and started_at <= now() and expires_at > now() and not suspended
      order by expires_at desc limit 1;
  end if;
  return new;
end;
$function$;
revoke all on function public.maro_guard_brain_update() from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.maro_mcp_custom_access_token_hook(event jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  claims jsonb;
begin
  claims := coalesce(event -> 'claims', '{}'::jsonb);

  -- client_id is present on Supabase OAuth 2.1 Server access tokens, including
  -- refreshes. Social-login/direct application sessions do not cross this gate.
  if nullif(claims ->> 'client_id', '') is not null then
    claims := jsonb_set(
      claims,
      '{aud}',
      to_jsonb('https://maro.al/api/mcp'::text),
      true
    );
    claims := jsonb_set(claims, '{maro_mcp}', 'true'::jsonb, true);
    claims := jsonb_set(
      claims,
      '{maro_mcp_permissions}',
      '["account:read", "image:generate"]'::jsonb,
      true
    );
  end if;

  return jsonb_build_object('claims', claims);
end;
$function$;
revoke all on function public.maro_mcp_custom_access_token_hook(jsonb) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.maro_refresh_brain_retention(p_user uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'storage'
AS $function$
declare w record; m record; renewal record; cleared integer := 0; previous_flag text;
begin
  previous_flag := current_setting('maro.brain_retention', true);
  perform set_config('maro.brain_retention', 'on', true);
  for w in select * from public.workspaces where owner_id = p_user order by id for update loop
    select started_at, expires_at into m from public.memberships
      where user_id = p_user and started_at <= now() and expires_at > now() and not suspended
        and plan_id in ('standard','pro','business') order by expires_at desc limit 1;
    -- Walk renewals in order so several missed reconciliation runs cannot reset
    -- a continuously paid account. A real 60-day gap stops the recovery chain.
    for renewal in select started_at, expires_at from public.memberships
      where user_id = p_user and started_at <= now() and not suspended
        and plan_id in ('standard','pro','business') and expires_at > w.brain_retention_anchor_at
      order by started_at, expires_at loop
      exit when renewal.started_at >= w.brain_retention_anchor_at + interval '60 days';
      w.brain_retention_anchor_at := greatest(w.brain_retention_anchor_at, renewal.expires_at);
    end loop;
    update public.workspaces set brain_retention_anchor_at = w.brain_retention_anchor_at
      where id = w.id and brain_retention_anchor_at is distinct from w.brain_retention_anchor_at;
    -- Renewing before the deadline preserves everything. Renewing after it cannot
    -- resurrect a profile even if the scheduled cleanup was temporarily unavailable.
    if w.brain_retention_anchor_at is not null
       and w.brain_retention_anchor_at + interval '60 days' <= now()
       then
      insert into public.brain_retention_files(path)
        select name from storage.objects where bucket_id = 'generations'
          and starts_with(name, p_user::text || '/workspace-assets/' || w.id || '/')
        on conflict do nothing;
      delete from public.workspace_sources where workspace_id = w.id and owner_id = p_user;
      update public.workspaces set brain_profile = '{}'::jsonb,
        brand_name = case when brand_name = brain_profile #>> '{brand,name}' then null else brand_name end,
        brand_logo_url = case when brand_logo_url = coalesce(brain_profile #>> '{brand,logoStorageRef}', brain_profile #>> '{brand,logoUrl}') then null else brand_logo_url end,
        brain_reset_at = clock_timestamp(), brain_retention_anchor_at = case when m.expires_at > now() then m.expires_at else null end
        where id = w.id;
      cleared := cleared + 1;
    elsif m.expires_at > now() then
      update public.workspaces set brain_retention_anchor_at = m.expires_at
        where id = w.id and brain_retention_anchor_at is distinct from m.expires_at;
    end if;
  end loop;
  perform set_config('maro.brain_retention', coalesce(previous_flag, ''), true);
  return cleared;
end;
$function$;
revoke all on function public.maro_refresh_brain_retention(uuid) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.maro_reset_expired_brains(p_limit integer DEFAULT 200)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare item record; cleared integer := 0;
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'unauthorized'; end if;
  for item in select owner_id,min(brain_retention_anchor_at) oldest from public.workspaces
    where brain_retention_anchor_at + interval '60 days' <= now()
    group by owner_id order by oldest limit least(greatest(p_limit,1),500) loop
    cleared := cleared + public.maro_refresh_brain_retention(item.owner_id);
  end loop;
  return cleared;
end;
$function$;
revoke all on function public.maro_reset_expired_brains(integer) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.maro_storage_limit_internal(p_user uuid)
 RETURNS bigint
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case public.maro_active_plan(p_user) when 'pro' then 5000000000::bigint
    when 'business' then null::bigint else 1000000000::bigint end;
$function$;
revoke all on function public.maro_storage_limit_internal(uuid) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.maro_storage_owner(p_bucket text, p_name text, p_metadata jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare candidate text;
begin
  if p_bucket = 'generations' then
    candidate := case when p_name like 'public/project-assets/%' then split_part(p_name,'/',3) else split_part(p_name,'/',1) end;
  elsif p_bucket = 'maro-public' and p_name like 'public/avatars/%' then
    candidate := split_part(p_name,'/',3);
  elsif p_bucket = 'maro-public' and p_name like 'public/explore/%' then
    candidate := p_metadata->>'maro_owner_id';
    if candidate is null then
      select user_id::text into candidate from public.public_creations
      where slug = split_part(p_name,'/',3) limit 1;
    end if;
  end if;
  if candidate ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return candidate::uuid; end if;
  return null;
end;
$function$;
revoke all on function public.maro_storage_owner(text,text,jsonb) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.maro_storage_used_internal(p_user uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'storage'
AS $function$
declare used_bytes bigint;
begin
  select coalesce(sum(case when (o.metadata->>'size') ~ '^[0-9]+$' then (o.metadata->>'size')::bigint else 0 end),0)
    into used_bytes from storage.objects o
    where o.bucket_id in ('generations','maro-public')
      and public.maro_storage_owner(o.bucket_id,o.name,o.user_metadata) = p_user;
  return used_bytes;
end;
$function$;
revoke all on function public.maro_storage_used_internal(uuid) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.membership_effective_status(p_expires_at timestamp with time zone, p_renewal_window_days integer, p_plan_id text, p_suspended boolean, p_at timestamp with time zone DEFAULT now())
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
begin
  if p_plan_id = 'business' then
    if p_suspended then return 'BUSINESS_SUSPENDED'; end if;
    if p_expires_at <= p_at then return 'BUSINESS_EXPIRED'; end if;
    return 'BUSINESS_ACTIVE';
  end if;
  if p_expires_at <= p_at then return 'EXPIRED'; end if;
  if p_at >= (p_expires_at - (p_renewal_window_days || ' days')::interval) then
    return 'RENEWAL_WINDOW';
  end if;
  return 'ACTIVE';
end;
$function$;
revoke all on function public.membership_effective_status(timestamp with time zone,integer,text,boolean,timestamp with time zone) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.persist_v1_image_generation(p_job_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare j public.generation_jobs; s jsonb; g public.generations; path text; ref text; workspace text;
begin
  select * into j from public.generation_jobs where id=p_job_id for update;
  if j.id is null or j.metadata->>'v1_durable' is distinct from 'true' or j.status not in ('reserved','processing','completed') then raise exception 'invalid_persistence_state'; end if;
  select * into g from public.generations where job_id=p_job_id;
  if g.id is not null then return g.id; end if;
  if j.status='completed' or j.metadata#>>'{v1_lifecycle,phase}' is distinct from 'provider_succeeded' then raise exception 'provider_result_missing'; end if;
  s := j.metadata->'v1_request';
  path := j.user_id::text||'/'||j.id::text||'/output.png'; ref := 'storage:generations/'||path;
  if not exists(select 1 from storage.objects where bucket_id='generations' and name=path and coalesce((metadata->>'size')::bigint,0)>0) then raise exception 'durable_output_missing'; end if;
  if s->>'userId' is distinct from j.user_id::text or s->>'registryToolId' is distinct from j.module or s#>>'{model,providerModelId}' is distinct from j.model or (s->>'imageCount')::integer is distinct from 1 then raise exception 'invalid_generation_snapshot'; end if;
  workspace := nullif(s->>'workspaceId','');
  if workspace is not null and not exists(select 1 from public.workspaces where id=workspace and owner_id=j.user_id) then raise exception 'invalid_generation_workspace'; end if;
  insert into public.generations(job_id,user_id,user_email,tool_id,model,kind,prompt,final_prompt,credits_spent,output_urls,selections,workspace_id)
    values(j.id,j.user_id,(select email from public.profiles where id=j.user_id),j.module,j.model,'image',s->>'prompt','',0,array[ref],coalesce(s->'selections','{}'::jsonb),workspace) returning * into g;
  update public.generation_jobs set metadata=jsonb_set(metadata,'{v1_lifecycle}',coalesce(metadata->'v1_lifecycle','{}'::jsonb)||jsonb_build_object('phase','persisted','generation_id',g.id)) where id=j.id;
  return g.id;
end $function$;
revoke all on function public.persist_v1_image_generation(uuid) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.prepare_raiaccept_receipt(p_order_id uuid, p_lease uuid, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r public.raiaccept_receipt_jobs%rowtype;
begin
  if auth.role() is distinct from 'service_role' then return jsonb_build_object('ok',false,'error','forbidden');end if;
  select * into r from public.raiaccept_receipt_jobs where order_id=p_order_id for update;
  if not found or p_lease is null or r.lease_id is distinct from p_lease or r.state<>'sending' then return jsonb_build_object('ok',false,'error','lease_mismatch');end if;
  if r.request_payload is null then
    if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>32768 then return jsonb_build_object('ok',false,'error','invalid_request');end if;
    update public.raiaccept_receipt_jobs set request_payload=p_payload,first_attempt_at=now() where order_id=p_order_id returning * into r;
  end if;
  return jsonb_build_object('ok',true,'payload',r.request_payload);
end;$function$;
revoke all on function public.prepare_raiaccept_receipt(uuid,uuid,jsonb) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.reconcile_generation_job(p_job_id uuid, p_stale_minutes integer DEFAULT 15)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare j public.generation_jobs;
begin
  select * into j from public.generation_jobs where id=p_job_id for update;
  if j.id is null then return 'missing'; end if;
  if j.status in ('completed','failed','cancelled') then return j.status; end if;
  if j.created_at > now()-make_interval(mins=>greatest(1,p_stale_minutes)) then return 'active'; end if;
  if j.metadata->>'v1_durable'='true' then
    if not exists(select 1 from public.generations where job_id=j.id)
      and j.metadata#>>'{v1_lifecycle,phase}'='provider_succeeded'
      and exists(select 1 from storage.objects where bucket_id='generations' and name=j.user_id::text||'/'||j.id::text||'/output.png' and coalesce((metadata->>'size')::bigint,0)>0) then
      -- Process died after storage; the trusted snapshot supplies the required history.
      perform public.persist_v1_image_generation(j.id);
    end if;
    if exists(select 1 from public.generations where job_id=j.id) then return public.settle_v1_image_job(j.id); end if;
    return public.fail_v1_image_job(j.id,'execution_interrupted');
  end if;
  if public.release_credit_reserve(j.id,'stale-'||j.id) then return 'released'; end if;
  return 'unchanged';
end $function$;
revoke all on function public.reconcile_generation_job(uuid,integer) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.reconcile_stale_generation_jobs(p_stale_minutes integer DEFAULT 15)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r record; n integer:=0;
begin
  for r in select id from public.generation_jobs where status in ('pending','reserved','processing') and created_at < now()-make_interval(mins=>greatest(1,p_stale_minutes)) order by id for update skip locked loop
    perform public.reconcile_generation_job(r.id,p_stale_minutes); n:=n+1;
  end loop;
  return n;
end $function$;
revoke all on function public.reconcile_stale_generation_jobs(integer) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.record_creation_view(p_creation uuid, p_visitor text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare changes integer; result integer;
begin
  perform 1 from public.public_creations where id=p_creation and deleted_at is null for update;
  if not found then raise exception 'creation_not_found'; end if;
  insert into public.creation_views(creation_id,visitor_hash) values(p_creation,p_visitor) on conflict do nothing;
  get diagnostics changes=row_count;
  update public.public_creations set view_count=view_count+changes where id=p_creation returning view_count into result;
  return result;
end $function$;
revoke all on function public.record_creation_view(uuid,text) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.refund_credits_atomic(p_user uuid, p_amount integer, p_idempotency_key text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  new_balance integer;
begin
  if p_amount <= 0 then return -1; end if;

  if p_idempotency_key is not null and exists (
    select 1 from public.credit_transactions
    where user_id = p_user and idempotency_key = p_idempotency_key and type = 'refund'
  ) then
    select credits into new_balance from public.profiles where id = p_user;
    return coalesce(new_balance, -1);
  end if;

  update public.profiles
  set credits = credits + p_amount
  where id = p_user
  returning credits into new_balance;

  if new_balance is null then return -1; end if;

  insert into public.credit_transactions (user_id, type, amount, balance_after, idempotency_key)
  values (p_user, 'refund', p_amount, new_balance, p_idempotency_key);

  return new_balance;
end;
$function$;
revoke all on function public.refund_credits_atomic(uuid,integer,text) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.release_credit_reserve(p_job_id uuid, p_idempotency_key text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare j public.generation_jobs; r public.credit_transactions; bal integer;
begin
  -- Same lock/order as reserve/finalize/persist/reconcile. No process-local locking.
  select * into j from public.generation_jobs where id=p_job_id for update;
  if j.id is null then return false; end if;
  if j.status='completed' or exists(select 1 from public.credit_transactions where job_id=p_job_id and type='charge') then return false; end if;
  if exists(select 1 from public.credit_transactions where job_id=p_job_id and type in ('release','refund')) then return true; end if;
  -- Retain a persisted result and hold for reconciliation; never compensate an uncertain charge.
  if j.metadata->>'v1_durable'='true' and exists(select 1 from public.generations where job_id=p_job_id) then return false; end if;
  select * into r from public.credit_transactions where job_id=p_job_id and type='reserve' order by created_at limit 1;
  if r.id is not null then
    update public.profiles set credits=credits+r.amount,credits_reserved=credits_reserved-r.amount where id=r.user_id and credits_reserved>=r.amount returning credits into bal;
    if not found then raise exception 'reservation_accounting_mismatch'; end if;
    insert into public.credit_transactions(user_id,job_id,type,amount,balance_after,idempotency_key) values(r.user_id,p_job_id,'release',r.amount,bal,p_idempotency_key);
  end if;
  if j.status not in ('failed','cancelled') then
    update public.generation_jobs set status='failed',credits_reserved=0,finished_at=now(),error=coalesce(error,'generation_failed') where id=p_job_id;
  end if;
  return true;
end $function$;
revoke all on function public.release_credit_reserve(uuid,text) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.reserve_credits(p_user uuid, p_amount integer, p_job_id uuid, p_idempotency_key text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare j public.generation_jobs; r public.credit_transactions; bal integer;
begin
  select * into j from public.generation_jobs where id=p_job_id for update;
  if j.id is null or j.user_id <> p_user or j.status not in ('pending','reserved','processing') or p_amount <= 0 then return -1; end if;
  if j.metadata->>'v1_durable' = 'true' and p_amount is distinct from (j.metadata#>>'{v1_request,model,customerCredits}')::integer then return -1; end if;
  select * into r from public.credit_transactions where job_id=p_job_id and type='reserve' order by created_at limit 1;
  if r.id is not null then
    if r.user_id <> p_user or r.amount <> p_amount then return -1; end if;
    select credits into bal from public.profiles where id=p_user;
    return bal;
  end if;
  -- credits is already the spendable balance: reserve debits it exactly once.
  select credits into bal from public.profiles where id=p_user for update;
  if bal is null or bal < p_amount then return -1; end if;
  update public.profiles set credits=credits-p_amount, credits_reserved=credits_reserved+p_amount where id=p_user returning credits into bal;
  insert into public.credit_transactions(user_id,job_id,type,amount,balance_after,idempotency_key) values(p_user,p_job_id,'reserve',p_amount,bal,p_idempotency_key);
  update public.generation_jobs set status='reserved',credits_reserved=p_amount where id=p_job_id;
  return bal;
end $function$;
revoke all on function public.reserve_credits(uuid,integer,uuid,text) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.reserve_raiaccept_checkout(p_user_id uuid, p_request_key uuid, p_item_id text, p_environment text, p_merchant text, p_billing jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  c public.raiaccept_checkouts%rowtype;
  o public.credit_orders%rowtype;
  m record;
  cp public.commerce_plans%rowtype;
  tp public.commerce_topups%rowtype;
  effective text := 'NO_PLAN';
  kind text;
  amount integer;
  credit_count integer;
  label text;
  snapshot jsonb;
  order_uuid uuid := gen_random_uuid();
  email text;
begin
  if auth.role() is distinct from 'service_role' then return jsonb_build_object('ok',false,'error','forbidden'); end if;
  if p_user_id is null or p_request_key is null or p_item_id is null or length(p_item_id)>64
    or p_environment is null or p_environment not in ('sandbox','production')
    or p_merchant is null or p_merchant !~ '^[A-Za-z0-9_-]{1,150}$' then
    return jsonb_build_object('ok',false,'error','invalid_request');
  end if;
  if p_billing is null or jsonb_typeof(p_billing)<>'object' or p_billing->'legalConsent' is distinct from 'true'::jsonb
    or coalesce(length(trim(p_billing->>'fullName')),0) not between 1 and 255
    or coalesce(length(trim(p_billing->>'email')),0) not between 1 and 255
    or coalesce(length(trim(p_billing->>'country')),0) not between 1 and 255
    or coalesce(length(trim(p_billing->>'city')),0) not between 1 and 255 then
    return jsonb_build_object('ok',false,'error','invalid_billing');
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,742));
  perform 1 from public.profiles where id=p_user_id for update;
  if not found then return jsonb_build_object('ok',false,'error','user_not_found'); end if;
  select * into c from public.raiaccept_checkouts where user_id=p_user_id and environment=p_environment and request_key=p_request_key;
  if found then
    if c.requested_item is distinct from p_item_id or c.merchant_account_id is distinct from p_merchant or c.billing_snapshot is distinct from p_billing then
      return jsonb_build_object('ok',false,'error','idempotency_conflict');
    end if;
    select * into o from public.credit_orders where id=c.order_id;
    return jsonb_build_object('ok',true,'created',false,'checkout',to_jsonb(c),'order',to_jsonb(o));
  end if;
  select m2.*,cp2.renewal_window_days into m from public.memberships m2 join public.commerce_plans cp2 on cp2.id=m2.plan_id
    where m2.user_id=p_user_id order by m2.expires_at desc limit 1;
  if m.id is not null then effective := public.membership_effective_status(m.expires_at,m.renewal_window_days,m.plan_id,m.suspended,now()); end if;
  if p_item_id like 'topup-%' then
    if effective not in ('ACTIVE','RENEWAL_WINDOW','BUSINESS_ACTIVE') then return jsonb_build_object('ok',false,'error','topup_requires_active_plan'); end if;
    select * into tp from public.commerce_topups where id=p_item_id and enabled;
    if tp.id is null or tp.currency<>'EUR' then return jsonb_build_object('ok',false,'error','invalid_item'); end if;
    kind := 'topup'; amount := tp.price_cents; credit_count := tp.credits; label := tp.credits::text || ' kredite Top-up';
    snapshot := jsonb_build_object('topup_id',tp.id);
  else
    if m.id is not null and m.payment_provider='paddle' and (m.paddle_status<>'canceled' or m.expires_at>now()) then
      return jsonb_build_object('ok',false,'error','paddle_managed_subscription');
    end if;
    if exists(select 1 from public.raiaccept_checkouts where user_id=p_user_id and environment=p_environment and holds_membership) then
      return jsonb_build_object('ok',false,'error','order_in_progress');
    end if;
    if p_item_id in ('standard','pro') then
      if effective in ('ACTIVE','RENEWAL_WINDOW','BUSINESS_ACTIVE') then return jsonb_build_object('ok',false,'error','plan_already_active'); end if;
      select * into cp from public.commerce_plans where id=p_item_id and enabled and not contact_only;
      kind := 'plan_purchase';
    elsif p_item_id='renew' then
      if effective<>'RENEWAL_WINDOW' then return jsonb_build_object('ok',false,'error','renewal_not_available'); end if;
      if m.cycle_renewal_fulfilled_at is not null and m.cycle_renewal_fulfilled_at >= m.expires_at - m.renewal_window_days * interval '1 day' then
        return jsonb_build_object('ok',false,'error','renewal_already_fulfilled');
      end if;
      select * into cp from public.commerce_plans where id=m.plan_id and enabled and not contact_only;
      kind := 'plan_renewal';
    elsif p_item_id in ('upgrade','upgrade-pro') then
      if effective not in ('ACTIVE','RENEWAL_WINDOW') or m.plan_id<>'standard' then return jsonb_build_object('ok',false,'error','upgrade_not_eligible'); end if;
      select * into cp from public.commerce_plans where id='pro' and enabled and not contact_only;
      kind := 'plan_upgrade';
    else return jsonb_build_object('ok',false,'error','invalid_item'); end if;
    if cp.id is null or cp.currency<>'EUR' or cp.renewal_mode<>'manual' or cp.duration_days<1 then
      return jsonb_build_object('ok',false,'error','invalid_item');
    end if;
    amount := cp.price_cents; credit_count := cp.included_credits; label := cp.display_name;
    snapshot := jsonb_build_object('plan_id',cp.id,'duration_days',cp.duration_days,'renewal_window_days',cp.renewal_window_days);
    if kind='plan_upgrade' then
      select amount - price_cents,credit_count - included_credits into amount,credit_count from public.commerce_plans where id='standard' and enabled;
      snapshot := snapshot || jsonb_build_object('upgrade_from','standard','upgrade_to','pro');
    end if;
  end if;
  if amount is null or credit_count is null or amount<=0 or credit_count<=0 then return jsonb_build_object('ok',false,'error','invalid_item'); end if;
  snapshot := snapshot || jsonb_build_object('captured_at',now(),'order_kind',kind,'plan_name_snapshot',label,'price_cents',amount,'currency','EUR','credits_snapshot',credit_count);
  select u.email into email from auth.users u where u.id=p_user_id;
  insert into public.credit_orders(id,user_id,user_email,credits,amount_cents,currency,status,provider,item_type,item_id,order_kind,commercial_snapshot,billing_snapshot)
    values(order_uuid,p_user_id,email,credit_count,amount,'EUR','pending','raiaccept',case when kind='topup' then 'topup' else 'plan' end,
      case when kind='topup' then tp.id else cp.id end,kind,snapshot,p_billing) returning * into o;
  insert into public.raiaccept_checkouts(order_id,user_id,request_key,requested_item,environment,merchant_account_id,merchant_reference,
    amount_cents,currency,credits,commercial_snapshot,billing_snapshot,expected_membership_id,expected_membership_expires_at,holds_membership)
    values(order_uuid,p_user_id,p_request_key,p_item_id,p_environment,p_merchant,'MARO-' || case when p_environment='production' then 'P-' else 'S-' end || order_uuid::text,
      amount,'EUR',credit_count,snapshot,p_billing,m.id,m.expires_at,kind<>'topup') returning * into c;
  return jsonb_build_object('ok',true,'created',true,'checkout',to_jsonb(c),'order',to_jsonb(o));
end;
$function$;
revoke all on function public.reserve_raiaccept_checkout(uuid,uuid,text,text,text,jsonb) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.resolve_workspace_limit(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  m record;
  bo jsonb;
  eff text;
begin
  select
    m2.id,
    m2.plan_id,
    m2.expires_at,
    m2.suspended,
    m2.business_overrides,
    cp2.workspace_limit,
    cp2.renewal_window_days
  into m
  from public.memberships m2
  join public.commerce_plans cp2 on cp2.id = m2.plan_id
  where m2.user_id = p_user_id
  order by m2.expires_at desc
  limit 1;

  if m.id is null then
    return 1;
  end if;

  eff := public.membership_effective_status(
    m.expires_at,
    m.renewal_window_days,
    m.plan_id,
    m.suspended,
    now()
  );

  if eff in ('EXPIRED', 'BUSINESS_EXPIRED', 'BUSINESS_SUSPENDED') then
    return 1;
  end if;

  if m.plan_id = 'business' then
    bo := coalesce(m.business_overrides, '{}'::jsonb);
    if bo ? 'workspace_limit' and (bo->>'workspace_limit') ~ '^[0-9]+$' then
      return greatest(1, (bo->>'workspace_limit')::integer);
    end if;
  end if;

  return greatest(1, coalesce(m.workspace_limit, 1));
end;
$function$;
revoke all on function public.resolve_workspace_limit(uuid) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.reveal_prompt(p_user uuid, p_prompt uuid, p_cost integer)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  already boolean;
  exists_prompt boolean;
  new_balance integer;
begin
  select exists (
    select 1 from public.maro_prompts where id = p_prompt and active
  ) into exists_prompt;
  if not exists_prompt then
    return 'missing';
  end if;

  select exists (
    select 1 from public.prompt_reveals where user_id = p_user and prompt_id = p_prompt
  ) into already;
  if already then
    return 'owned';
  end if;

  -- Charge atomically (only if enough credits).
  update public.profiles
    set credits = credits - p_cost
    where id = p_user and credits >= p_cost
    returning credits into new_balance;

  if new_balance is null then
    return 'insufficient';
  end if;

  insert into public.prompt_reveals (user_id, prompt_id, credits_spent)
  values (p_user, p_prompt, p_cost)
  on conflict (user_id, prompt_id) do nothing;

  update public.maro_prompts
    set reveal_count = reveal_count + 1
    where id = p_prompt;

  return 'ok';
end;
$function$;
revoke all on function public.reveal_prompt(uuid,uuid,integer) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.set_limit(real)
 RETURNS real
 LANGUAGE c
 STRICT
AS '$libdir/pg_trgm', $function$set_limit$function$;
revoke all on function public.set_limit(real) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.settle_v1_image_job(p_job_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare j public.generation_jobs; already boolean;
begin
  select * into j from public.generation_jobs where id=p_job_id for update;
  if j.id is null or j.metadata->>'v1_durable' is distinct from 'true' then return 'invalid_state'; end if;
  already := exists(select 1 from public.credit_transactions where job_id=p_job_id and type='charge');
  if public.finalize_credit_charge(p_job_id) then return case when already then 'already_finalized' else 'finalized' end; end if;
  if j.status in ('failed','cancelled','completed') then return 'invalid_state'; end if;
  if public.v1_image_success_evidence(p_job_id) then
    update public.generation_jobs set error='settlement_pending',metadata=jsonb_set(metadata,'{v1_lifecycle,phase}','"settlement_pending"') where id=p_job_id;
    return 'settlement_pending';
  end if;
  return 'evidence_missing';
end $function$;
revoke all on function public.settle_v1_image_job(uuid) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.show_limit()
 RETURNS real
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$show_limit$function$;
revoke all on function public.show_limit() from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.show_trgm(text)
 RETURNS text[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$show_trgm$function$;
revoke all on function public.show_trgm(text) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.similarity_dist(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_dist$function$;
revoke all on function public.similarity_dist(text,text) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_op$function$;
revoke all on function public.similarity_op(text,text) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity$function$;
revoke all on function public.similarity(text,text) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.spend_credits(p_user uuid, p_amount integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare new_balance integer;
begin
  update public.profiles set credits = credits - p_amount
    where id = p_user and credits >= p_amount
    returning credits into new_balance;
  if new_balance is null then return -1; end if;
  return new_balance;
end;
$function$;
revoke all on function public.spend_credits(uuid,integer) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.start_v1_image_job(p_job_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare j public.generation_jobs;
begin
  select * into j from public.generation_jobs where id=p_job_id for update;
  if j.id is null or j.metadata->>'v1_durable' is distinct from 'true' or j.status <> 'reserved' or j.credits_reserved <= 0 then return false; end if;
  update public.generation_jobs set status='processing',started_at=now() where id=p_job_id;
  return true;
end $function$;
revoke all on function public.start_v1_image_job(uuid) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.strict_word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_commutator_op$function$;
revoke all on function public.strict_word_similarity_commutator_op(text,text) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.strict_word_similarity_dist_commutator_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_dist_commutator_op$function$;
revoke all on function public.strict_word_similarity_dist_commutator_op(text,text) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.strict_word_similarity_dist_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_dist_op$function$;
revoke all on function public.strict_word_similarity_dist_op(text,text) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.strict_word_similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_op$function$;
revoke all on function public.strict_word_similarity_op(text,text) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.strict_word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity$function$;
revoke all on function public.strict_word_similarity(text,text) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.sync_maro_preset_search_text()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.search_text := trim(concat_ws(' ',
    coalesce(new.title, new.code),
    new.category,
    array_to_string(new.keywords, ' '),
    new.description
  ));
  new.updated_at := now();
  return new;
end;
$function$;
revoke all on function public.sync_maro_preset_search_text() from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.sync_profile_admin_flags()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if tg_op = 'UPDATE' then
    if new.access_role is distinct from old.access_role then
      new.is_admin := new.access_role is not null;
    elsif new.is_admin is distinct from old.is_admin and new.is_admin = true and new.access_role is null then
      new.access_role := 'super_admin';
    elsif new.is_admin is distinct from old.is_admin and new.is_admin = false then
      new.access_role := null;
    end if;
  elsif tg_op = 'INSERT' then
    if new.access_role is not null then
      new.is_admin := true;
    elsif new.is_admin = true and new.access_role is null then
      new.access_role := 'super_admin';
    end if;
  end if;
  return new;
end;
$function$;
revoke all on function public.sync_profile_admin_flags() from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.toggle_creation_save(p_user uuid, p_creation uuid, p_add boolean)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare changes integer; result integer;
begin
  perform 1 from public.public_creations where id=p_creation and deleted_at is null for update;
  if not found then raise exception 'creation_not_found'; end if;
  if p_add then
    insert into public.creation_saves(user_id,creation_id) values(p_user,p_creation) on conflict do nothing;
    get diagnostics changes=row_count;
    update public.public_creations set save_count=save_count+changes where id=p_creation returning save_count into result;
  else
    delete from public.creation_saves where user_id=p_user and creation_id=p_creation;
    get diagnostics changes=row_count;
    update public.public_creations set save_count=greatest(0,save_count-changes) where id=p_creation returning save_count into result;
  end if;
  return result;
end $function$;
revoke all on function public.toggle_creation_save(uuid,uuid,boolean) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.transition_raiaccept_checkout(p_order_id uuid, p_user_id uuid, p_lease_id uuid, p_action text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare c public.raiaccept_checkouts%rowtype; claimed boolean := false;
begin
  if auth.role() is distinct from 'service_role' then return jsonb_build_object('ok',false,'error','forbidden'); end if;
  select * into c from public.raiaccept_checkouts where order_id=p_order_id and user_id=p_user_id for update;
  if not found then return jsonb_build_object('ok',false,'error','not_found'); end if;
  if p_action='claim_order' then
    if c.creation_state='reserved' then
      if p_data->'invoice'->>'merchantOrderReference' is distinct from c.merchant_reference
        or p_data->'invoice'->>'currency' is distinct from c.currency
        or jsonb_typeof(p_data->'invoice'->'amount') is distinct from 'number'
        or (p_data->'invoice'->>'amount')::numeric*100<>c.amount_cents then
        return jsonb_build_object('ok',false,'error','payload_mismatch');
      end if;
      update public.raiaccept_checkouts set creation_state='creating',request_payload=p_data,lease_id=gen_random_uuid(),lease_started_at=now(),updated_at=now()
        where order_id=p_order_id returning * into c; claimed := true;
    end if;
  elsif p_action='claim_session' then
    if c.creation_state='created' and c.session_state='not_started' then
      update public.raiaccept_checkouts set session_state='creating',lease_id=gen_random_uuid(),lease_started_at=now(),updated_at=now()
        where order_id=p_order_id returning * into c; claimed := true;
    end if;
  else
    if p_lease_id is null or c.lease_id is distinct from p_lease_id then return jsonb_build_object('ok',false,'error','lease_mismatch'); end if;
    if p_action='bind_order' and c.creation_state='creating' then
      if p_data->>'id' is null or p_data->>'id' !~ '^[A-Za-z0-9_-]{1,150}$'
        or p_data->>'merchantAccountId' is distinct from c.merchant_account_id
        or p_data->>'merchantReference' is distinct from c.merchant_reference
        or p_data->>'currency' is distinct from c.currency or p_data->>'status' is distinct from 'DRAFT'
        or jsonb_typeof(p_data->'isProduction') is distinct from 'boolean'
        or (p_data->>'isProduction')::boolean is distinct from (c.environment='production')
        or jsonb_typeof(p_data->'amountCents') is distinct from 'number'
        or (p_data->>'amountCents')::numeric<>c.amount_cents then return jsonb_build_object('ok',false,'error','provider_order_mismatch'); end if;
      update public.raiaccept_checkouts set provider_order_id=p_data->>'id',creation_state='created',lease_id=null,updated_at=now()
        where order_id=p_order_id returning * into c;
      update public.credit_orders set provider_order_id=c.provider_order_id where id=p_order_id;
    elsif p_action='bind_session' and c.session_state='creating' then
      if p_data->>'sessionId' is null or p_data->>'sessionId' !~ '^[A-Za-z0-9_-]{1,150}$'
        or p_data->>'redirectUrl' is distinct from ('https://payment.raiaccept.com/checkout?paymentSession=' || (p_data->>'sessionId')) then
        return jsonb_build_object('ok',false,'error','provider_session_mismatch');
      end if;
      update public.raiaccept_checkouts set session_id=p_data->>'sessionId',redirect_url=p_data->>'redirectUrl',session_state='ready',lease_id=null,updated_at=now()
        where order_id=p_order_id returning * into c;
    elsif p_action='order_error' and c.creation_state='creating' or p_action='session_error' and c.session_state='creating' then
      if p_data->>'code' is null or p_data->>'code' !~ '^[a-z0-9_]{1,100}$' or jsonb_typeof(p_data->'uncertain') is distinct from 'boolean' then
        return jsonb_build_object('ok',false,'error','invalid_error');
      end if;
      if p_action='order_error' then
        update public.raiaccept_checkouts set creation_state=case when (p_data->>'uncertain')::boolean then 'creation_unknown' else 'rejected' end,
          holds_membership=case when (p_data->>'uncertain')::boolean then holds_membership else false end,last_error=p_data->>'code',lease_id=null,updated_at=now()
          where order_id=p_order_id returning * into c;
        if c.creation_state='rejected' then update public.credit_orders set status='failed',cancel_reason='gateway_order_rejected' where id=p_order_id; end if;
      else
        -- A bank order already exists. Session errors do not prove no payment.
        update public.raiaccept_checkouts set session_state='creation_unknown',last_error=p_data->>'code',lease_id=null,updated_at=now()
          where order_id=p_order_id returning * into c;
      end if;
    else return jsonb_build_object('ok',false,'error','invalid_transition'); end if;
  end if;
  return jsonb_build_object('ok',true,'claimed',claimed,'checkout',to_jsonb(c));
end;
$function$;
revoke all on function public.transition_raiaccept_checkout(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.v1_image_lifecycle_version()
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ select 2 $function$;
revoke all on function public.v1_image_lifecycle_version() from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.v1_image_success_evidence(p_job_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists(select 1 from public.generation_jobs j join public.generations g on g.job_id=j.id
    join storage.objects o on o.bucket_id='generations' and o.name=j.user_id::text||'/'||j.id::text||'/output.png'
    where j.id=p_job_id and j.metadata->>'v1_durable'='true'
      and j.metadata#>>'{v1_lifecycle,phase}' in ('persisted','settlement_pending','completed')
      and g.id::text=j.metadata#>>'{v1_lifecycle,generation_id}' and g.user_id=j.user_id and g.tool_id=j.module and g.model=j.model and g.kind='image'
      and g.output_urls=array['storage:generations/'||o.name] and coalesce((o.metadata->>'size')::bigint,0)>0
      and j.metadata#>>'{v1_request,userId}'=j.user_id::text and j.metadata#>>'{v1_request,registryToolId}'=j.module
      and j.metadata#>>'{v1_request,model,providerModelId}'=j.model and j.metadata#>>'{v1_request,imageCount}'='1'
      and exists(select 1 from public.pricing_snapshots p where p.job_id=j.id and p.snapshot->>'record_type'='v1_image_execution'
        and p.snapshot#>>'{canonical,provenance,promptHash}'=j.metadata#>>'{canonical_prompt,hash}'));
$function$;
revoke all on function public.v1_image_success_evidence(uuid) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_commutator_op$function$;
revoke all on function public.word_similarity_commutator_op(text,text) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.word_similarity_dist_commutator_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_dist_commutator_op$function$;
revoke all on function public.word_similarity_dist_commutator_op(text,text) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.word_similarity_dist_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_dist_op$function$;
revoke all on function public.word_similarity_dist_op(text,text) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.word_similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_op$function$;
revoke all on function public.word_similarity_op(text,text) from public,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity$function$;
revoke all on function public.word_similarity(text,text) from public,anon,authenticated,service_role;
grant EXECUTE on function public.admin_adjust_credits(uuid,uuid,integer,text,text,jsonb) to "postgres";
grant EXECUTE on function public.admin_adjust_credits(uuid,uuid,integer,text,text,jsonb) to "service_role";
grant EXECUTE on function public.admin_grant_plan(uuid,uuid,text,integer,text,uuid) to "postgres";
grant EXECUTE on function public.admin_grant_plan(uuid,uuid,text,integer,text,uuid) to "service_role";
grant EXECUTE on function public.admin_publish_v1_prompt(uuid,uuid,boolean) to "postgres";
grant EXECUTE on function public.admin_publish_v1_prompt(uuid,uuid,boolean) to "service_role";
grant EXECUTE on function public.admin_save_v1_models(text,jsonb) to "postgres";
grant EXECUTE on function public.admin_save_v1_models(text,jsonb) to "service_role";
grant EXECUTE on function public.admin_v1_operations(timestamp with time zone,text) to "postgres";
grant EXECUTE on function public.admin_v1_operations(timestamp with time zone,text) to "service_role";
grant EXECUTE on function public.apply_paddle_event(jsonb) to "postgres";
grant EXECUTE on function public.apply_paddle_event(jsonb) to "service_role";
grant EXECUTE on function public.apply_raiaccept_verification(uuid,uuid,jsonb,jsonb) to "postgres";
grant EXECUTE on function public.apply_raiaccept_verification(uuid,uuid,jsonb,jsonb) to "service_role";
grant EXECUTE on function public.bump_creation_like(uuid,uuid,boolean) to "postgres";
grant EXECUTE on function public.bump_creation_like(uuid,uuid,boolean) to "service_role";
grant EXECUTE on function public.bump_prompt_use(uuid) to "postgres";
grant EXECUTE on function public.bump_prompt_use(uuid) to "service_role";
grant EXECUTE on function public.cancel_credit_order(uuid,text) to "postgres";
grant EXECUTE on function public.cancel_credit_order(uuid,text) to "service_role";
grant EXECUTE on function public.cancel_non_paddle_credit_order(uuid,text) to "postgres";
grant EXECUTE on function public.check_rate_limit(text,text,integer,integer) to "postgres";
grant EXECUTE on function public.check_rate_limit(text,text,integer,integer) to "service_role";
grant EXECUTE on function public.claim_raiaccept_receipts(text,text,integer) to "postgres";
grant EXECUTE on function public.claim_raiaccept_receipts(text,text,integer) to "service_role";
grant EXECUTE on function public.claim_raiaccept_verifications(text,text,integer,uuid) to "postgres";
grant EXECUTE on function public.claim_raiaccept_verifications(text,text,integer,uuid) to "service_role";
grant EXECUTE on function public.count_active_jobs(uuid) to "postgres";
grant EXECUTE on function public.count_active_jobs(uuid) to "service_role";
grant EXECUTE on function public.create_paddle_order(uuid,text,text,jsonb) to "postgres";
grant EXECUTE on function public.create_paddle_order(uuid,text,text,jsonb) to "service_role";
grant EXECUTE on function public.enforce_workspace_entitlement() to public;
grant EXECUTE on function public.enforce_workspace_entitlement() to "postgres";
grant EXECUTE on function public.enforce_workspace_entitlement() to "service_role";
grant EXECUTE on function public.enqueue_raiaccept_verification(text,text,text,text) to "postgres";
grant EXECUTE on function public.enqueue_raiaccept_verification(text,text,text,text) to "service_role";
grant EXECUTE on function public.ensure_default_workspace(uuid) to "postgres";
grant EXECUTE on function public.ensure_default_workspace(uuid) to "service_role";
grant EXECUTE on function public.fail_raiaccept_verification(uuid,uuid,text) to "postgres";
grant EXECUTE on function public.fail_raiaccept_verification(uuid,uuid,text) to "service_role";
grant EXECUTE on function public.fail_v1_image_job(uuid,text) to "postgres";
grant EXECUTE on function public.fail_v1_image_job(uuid,text) to "service_role";
grant EXECUTE on function public.finalize_credit_charge(uuid) to "postgres";
grant EXECUTE on function public.finalize_credit_charge(uuid) to "service_role";
grant EXECUTE on function public.finish_raiaccept_receipt(uuid,uuid,boolean,text,text) to "postgres";
grant EXECUTE on function public.finish_raiaccept_receipt(uuid,uuid,boolean,text,text) to "service_role";
grant EXECUTE on function public.fulfill_commerce_order(uuid,text) to "postgres";
grant EXECUTE on function public.fulfill_commerce_order(uuid,text) to "service_role";
grant EXECUTE on function public.fulfill_credit_order(uuid) to "postgres";
grant EXECUTE on function public.fulfill_credit_order(uuid) to "service_role";
grant EXECUTE on function public.fulfill_non_paddle_commerce_order(uuid,text) to "postgres";
grant EXECUTE on function public.gin_extract_query_trgm(text,internal,smallint,internal,internal,internal,internal) to public;
grant EXECUTE on function public.gin_extract_query_trgm(text,internal,smallint,internal,internal,internal,internal) to "anon";
grant EXECUTE on function public.gin_extract_query_trgm(text,internal,smallint,internal,internal,internal,internal) to "authenticated";
grant EXECUTE on function public.gin_extract_query_trgm(text,internal,smallint,internal,internal,internal,internal) to "postgres";
grant EXECUTE on function public.gin_extract_query_trgm(text,internal,smallint,internal,internal,internal,internal) to "service_role";
grant EXECUTE on function public.gin_extract_query_trgm(text,internal,smallint,internal,internal,internal,internal) to "supabase_admin";
grant EXECUTE on function public.gin_extract_value_trgm(text,internal) to public;
grant EXECUTE on function public.gin_extract_value_trgm(text,internal) to "anon";
grant EXECUTE on function public.gin_extract_value_trgm(text,internal) to "authenticated";
grant EXECUTE on function public.gin_extract_value_trgm(text,internal) to "postgres";
grant EXECUTE on function public.gin_extract_value_trgm(text,internal) to "service_role";
grant EXECUTE on function public.gin_extract_value_trgm(text,internal) to "supabase_admin";
grant EXECUTE on function public.gin_trgm_consistent(internal,smallint,text,integer,internal,internal,internal,internal) to public;
grant EXECUTE on function public.gin_trgm_consistent(internal,smallint,text,integer,internal,internal,internal,internal) to "anon";
grant EXECUTE on function public.gin_trgm_consistent(internal,smallint,text,integer,internal,internal,internal,internal) to "authenticated";
grant EXECUTE on function public.gin_trgm_consistent(internal,smallint,text,integer,internal,internal,internal,internal) to "postgres";
grant EXECUTE on function public.gin_trgm_consistent(internal,smallint,text,integer,internal,internal,internal,internal) to "service_role";
grant EXECUTE on function public.gin_trgm_consistent(internal,smallint,text,integer,internal,internal,internal,internal) to "supabase_admin";
grant EXECUTE on function public.gin_trgm_triconsistent(internal,smallint,text,integer,internal,internal,internal) to public;
grant EXECUTE on function public.gin_trgm_triconsistent(internal,smallint,text,integer,internal,internal,internal) to "anon";
grant EXECUTE on function public.gin_trgm_triconsistent(internal,smallint,text,integer,internal,internal,internal) to "authenticated";
grant EXECUTE on function public.gin_trgm_triconsistent(internal,smallint,text,integer,internal,internal,internal) to "postgres";
grant EXECUTE on function public.gin_trgm_triconsistent(internal,smallint,text,integer,internal,internal,internal) to "service_role";
grant EXECUTE on function public.gin_trgm_triconsistent(internal,smallint,text,integer,internal,internal,internal) to "supabase_admin";
grant EXECUTE on function public.gtrgm_compress(internal) to public;
grant EXECUTE on function public.gtrgm_compress(internal) to "anon";
grant EXECUTE on function public.gtrgm_compress(internal) to "authenticated";
grant EXECUTE on function public.gtrgm_compress(internal) to "postgres";
grant EXECUTE on function public.gtrgm_compress(internal) to "service_role";
grant EXECUTE on function public.gtrgm_compress(internal) to "supabase_admin";
grant EXECUTE on function public.gtrgm_consistent(internal,text,smallint,oid,internal) to public;
grant EXECUTE on function public.gtrgm_consistent(internal,text,smallint,oid,internal) to "anon";
grant EXECUTE on function public.gtrgm_consistent(internal,text,smallint,oid,internal) to "authenticated";
grant EXECUTE on function public.gtrgm_consistent(internal,text,smallint,oid,internal) to "postgres";
grant EXECUTE on function public.gtrgm_consistent(internal,text,smallint,oid,internal) to "service_role";
grant EXECUTE on function public.gtrgm_consistent(internal,text,smallint,oid,internal) to "supabase_admin";
grant EXECUTE on function public.gtrgm_decompress(internal) to public;
grant EXECUTE on function public.gtrgm_decompress(internal) to "anon";
grant EXECUTE on function public.gtrgm_decompress(internal) to "authenticated";
grant EXECUTE on function public.gtrgm_decompress(internal) to "postgres";
grant EXECUTE on function public.gtrgm_decompress(internal) to "service_role";
grant EXECUTE on function public.gtrgm_decompress(internal) to "supabase_admin";
grant EXECUTE on function public.gtrgm_distance(internal,text,smallint,oid,internal) to public;
grant EXECUTE on function public.gtrgm_distance(internal,text,smallint,oid,internal) to "anon";
grant EXECUTE on function public.gtrgm_distance(internal,text,smallint,oid,internal) to "authenticated";
grant EXECUTE on function public.gtrgm_distance(internal,text,smallint,oid,internal) to "postgres";
grant EXECUTE on function public.gtrgm_distance(internal,text,smallint,oid,internal) to "service_role";
grant EXECUTE on function public.gtrgm_distance(internal,text,smallint,oid,internal) to "supabase_admin";
grant EXECUTE on function public.gtrgm_in(cstring) to public;
grant EXECUTE on function public.gtrgm_in(cstring) to "anon";
grant EXECUTE on function public.gtrgm_in(cstring) to "authenticated";
grant EXECUTE on function public.gtrgm_in(cstring) to "postgres";
grant EXECUTE on function public.gtrgm_in(cstring) to "service_role";
grant EXECUTE on function public.gtrgm_in(cstring) to "supabase_admin";
grant EXECUTE on function public.gtrgm_options(internal) to public;
grant EXECUTE on function public.gtrgm_options(internal) to "anon";
grant EXECUTE on function public.gtrgm_options(internal) to "authenticated";
grant EXECUTE on function public.gtrgm_options(internal) to "postgres";
grant EXECUTE on function public.gtrgm_options(internal) to "service_role";
grant EXECUTE on function public.gtrgm_options(internal) to "supabase_admin";
grant EXECUTE on function public.gtrgm_out(gtrgm) to public;
grant EXECUTE on function public.gtrgm_out(gtrgm) to "anon";
grant EXECUTE on function public.gtrgm_out(gtrgm) to "authenticated";
grant EXECUTE on function public.gtrgm_out(gtrgm) to "postgres";
grant EXECUTE on function public.gtrgm_out(gtrgm) to "service_role";
grant EXECUTE on function public.gtrgm_out(gtrgm) to "supabase_admin";
grant EXECUTE on function public.gtrgm_penalty(internal,internal,internal) to public;
grant EXECUTE on function public.gtrgm_penalty(internal,internal,internal) to "anon";
grant EXECUTE on function public.gtrgm_penalty(internal,internal,internal) to "authenticated";
grant EXECUTE on function public.gtrgm_penalty(internal,internal,internal) to "postgres";
grant EXECUTE on function public.gtrgm_penalty(internal,internal,internal) to "service_role";
grant EXECUTE on function public.gtrgm_penalty(internal,internal,internal) to "supabase_admin";
grant EXECUTE on function public.gtrgm_picksplit(internal,internal) to public;
grant EXECUTE on function public.gtrgm_picksplit(internal,internal) to "anon";
grant EXECUTE on function public.gtrgm_picksplit(internal,internal) to "authenticated";
grant EXECUTE on function public.gtrgm_picksplit(internal,internal) to "postgres";
grant EXECUTE on function public.gtrgm_picksplit(internal,internal) to "service_role";
grant EXECUTE on function public.gtrgm_picksplit(internal,internal) to "supabase_admin";
grant EXECUTE on function public.gtrgm_same(gtrgm,gtrgm,internal) to public;
grant EXECUTE on function public.gtrgm_same(gtrgm,gtrgm,internal) to "anon";
grant EXECUTE on function public.gtrgm_same(gtrgm,gtrgm,internal) to "authenticated";
grant EXECUTE on function public.gtrgm_same(gtrgm,gtrgm,internal) to "postgres";
grant EXECUTE on function public.gtrgm_same(gtrgm,gtrgm,internal) to "service_role";
grant EXECUTE on function public.gtrgm_same(gtrgm,gtrgm,internal) to "supabase_admin";
grant EXECUTE on function public.gtrgm_union(internal,internal) to public;
grant EXECUTE on function public.gtrgm_union(internal,internal) to "anon";
grant EXECUTE on function public.gtrgm_union(internal,internal) to "authenticated";
grant EXECUTE on function public.gtrgm_union(internal,internal) to "postgres";
grant EXECUTE on function public.gtrgm_union(internal,internal) to "service_role";
grant EXECUTE on function public.gtrgm_union(internal,internal) to "supabase_admin";
grant EXECUTE on function public.guard_generation_job_transition() to public;
grant EXECUTE on function public.guard_generation_job_transition() to "postgres";
grant EXECUTE on function public.guard_generation_job_transition() to "service_role";
grant EXECUTE on function public.guard_logo_wizard_content_write() to public;
grant EXECUTE on function public.guard_logo_wizard_content_write() to "postgres";
grant EXECUTE on function public.guard_logo_wizard_content_write() to "service_role";
grant EXECUTE on function public.handle_new_user() to "postgres";
grant EXECUTE on function public.has_admin_access() to "anon";
grant EXECUTE on function public.has_admin_access() to "authenticated";
grant EXECUTE on function public.has_admin_access() to "postgres";
grant EXECUTE on function public.has_admin_access() to "service_role";
grant EXECUTE on function public.is_admin() to "anon";
grant EXECUTE on function public.is_admin() to "authenticated";
grant EXECUTE on function public.is_admin() to "postgres";
grant EXECUTE on function public.is_admin() to "service_role";
grant EXECUTE on function public.mark_v1_image_provider_result(uuid,text,jsonb) to "postgres";
grant EXECUTE on function public.mark_v1_image_provider_result(uuid,text,jsonb) to "service_role";
grant EXECUTE on function public.maro_account_policy(uuid,text) to "authenticated";
grant EXECUTE on function public.maro_account_policy(uuid,text) to "postgres";
grant EXECUTE on function public.maro_account_policy(uuid,text) to "service_role";
grant EXECUTE on function public.maro_active_plan(uuid) to "postgres";
grant EXECUTE on function public.maro_active_plan(uuid) to "service_role";
grant EXECUTE on function public.maro_brain_allowed() to "authenticated";
grant EXECUTE on function public.maro_brain_allowed() to "postgres";
grant EXECUTE on function public.maro_brain_allowed() to "service_role";
grant EXECUTE on function public.maro_enforce_account_storage_quota() to "postgres";
grant EXECUTE on function public.maro_enforce_account_storage_quota() to "service_role";
grant EXECUTE on function public.maro_generation_conversation_metadata() to "postgres";
grant EXECUTE on function public.maro_generation_conversation_metadata() to "service_role";
grant EXECUTE on function public.maro_guard_brain_update() to "postgres";
grant EXECUTE on function public.maro_guard_brain_update() to "service_role";
grant EXECUTE on function public.maro_mcp_custom_access_token_hook(jsonb) to "postgres";
grant EXECUTE on function public.maro_mcp_custom_access_token_hook(jsonb) to "service_role";
grant EXECUTE on function public.maro_mcp_custom_access_token_hook(jsonb) to "supabase_auth_admin";
grant EXECUTE on function public.maro_refresh_brain_retention(uuid) to "postgres";
grant EXECUTE on function public.maro_refresh_brain_retention(uuid) to "service_role";
grant EXECUTE on function public.maro_reset_expired_brains(integer) to "postgres";
grant EXECUTE on function public.maro_reset_expired_brains(integer) to "service_role";
grant EXECUTE on function public.maro_storage_limit_internal(uuid) to "postgres";
grant EXECUTE on function public.maro_storage_limit_internal(uuid) to "service_role";
grant EXECUTE on function public.maro_storage_owner(text,text,jsonb) to "postgres";
grant EXECUTE on function public.maro_storage_owner(text,text,jsonb) to "service_role";
grant EXECUTE on function public.maro_storage_used_internal(uuid) to "postgres";
grant EXECUTE on function public.maro_storage_used_internal(uuid) to "service_role";
grant EXECUTE on function public.membership_effective_status(timestamp with time zone,integer,text,boolean,timestamp with time zone) to "authenticated";
grant EXECUTE on function public.membership_effective_status(timestamp with time zone,integer,text,boolean,timestamp with time zone) to "postgres";
grant EXECUTE on function public.membership_effective_status(timestamp with time zone,integer,text,boolean,timestamp with time zone) to "service_role";
grant EXECUTE on function public.persist_v1_image_generation(uuid) to "postgres";
grant EXECUTE on function public.persist_v1_image_generation(uuid) to "service_role";
grant EXECUTE on function public.prepare_raiaccept_receipt(uuid,uuid,jsonb) to "postgres";
grant EXECUTE on function public.prepare_raiaccept_receipt(uuid,uuid,jsonb) to "service_role";
grant EXECUTE on function public.reconcile_generation_job(uuid,integer) to "postgres";
grant EXECUTE on function public.reconcile_generation_job(uuid,integer) to "service_role";
grant EXECUTE on function public.reconcile_stale_generation_jobs(integer) to "postgres";
grant EXECUTE on function public.reconcile_stale_generation_jobs(integer) to "service_role";
grant EXECUTE on function public.record_creation_view(uuid,text) to "postgres";
grant EXECUTE on function public.record_creation_view(uuid,text) to "service_role";
grant EXECUTE on function public.refund_credits_atomic(uuid,integer,text) to "postgres";
grant EXECUTE on function public.refund_credits_atomic(uuid,integer,text) to "service_role";
grant EXECUTE on function public.release_credit_reserve(uuid,text) to "postgres";
grant EXECUTE on function public.release_credit_reserve(uuid,text) to "service_role";
grant EXECUTE on function public.reserve_credits(uuid,integer,uuid,text) to "postgres";
grant EXECUTE on function public.reserve_credits(uuid,integer,uuid,text) to "service_role";
grant EXECUTE on function public.reserve_raiaccept_checkout(uuid,uuid,text,text,text,jsonb) to "postgres";
grant EXECUTE on function public.reserve_raiaccept_checkout(uuid,uuid,text,text,text,jsonb) to "service_role";
grant EXECUTE on function public.resolve_workspace_limit(uuid) to "authenticated";
grant EXECUTE on function public.resolve_workspace_limit(uuid) to "postgres";
grant EXECUTE on function public.resolve_workspace_limit(uuid) to "service_role";
grant EXECUTE on function public.reveal_prompt(uuid,uuid,integer) to "postgres";
grant EXECUTE on function public.reveal_prompt(uuid,uuid,integer) to "service_role";
grant EXECUTE on function public.set_limit(real) to public;
grant EXECUTE on function public.set_limit(real) to "anon";
grant EXECUTE on function public.set_limit(real) to "authenticated";
grant EXECUTE on function public.set_limit(real) to "postgres";
grant EXECUTE on function public.set_limit(real) to "service_role";
grant EXECUTE on function public.set_limit(real) to "supabase_admin";
grant EXECUTE on function public.settle_v1_image_job(uuid) to "postgres";
grant EXECUTE on function public.settle_v1_image_job(uuid) to "service_role";
grant EXECUTE on function public.show_limit() to public;
grant EXECUTE on function public.show_limit() to "anon";
grant EXECUTE on function public.show_limit() to "authenticated";
grant EXECUTE on function public.show_limit() to "postgres";
grant EXECUTE on function public.show_limit() to "service_role";
grant EXECUTE on function public.show_limit() to "supabase_admin";
grant EXECUTE on function public.show_trgm(text) to public;
grant EXECUTE on function public.show_trgm(text) to "anon";
grant EXECUTE on function public.show_trgm(text) to "authenticated";
grant EXECUTE on function public.show_trgm(text) to "postgres";
grant EXECUTE on function public.show_trgm(text) to "service_role";
grant EXECUTE on function public.show_trgm(text) to "supabase_admin";
grant EXECUTE on function public.similarity_dist(text,text) to public;
grant EXECUTE on function public.similarity_dist(text,text) to "anon";
grant EXECUTE on function public.similarity_dist(text,text) to "authenticated";
grant EXECUTE on function public.similarity_dist(text,text) to "postgres";
grant EXECUTE on function public.similarity_dist(text,text) to "service_role";
grant EXECUTE on function public.similarity_dist(text,text) to "supabase_admin";
grant EXECUTE on function public.similarity_op(text,text) to public;
grant EXECUTE on function public.similarity_op(text,text) to "anon";
grant EXECUTE on function public.similarity_op(text,text) to "authenticated";
grant EXECUTE on function public.similarity_op(text,text) to "postgres";
grant EXECUTE on function public.similarity_op(text,text) to "service_role";
grant EXECUTE on function public.similarity_op(text,text) to "supabase_admin";
grant EXECUTE on function public.similarity(text,text) to public;
grant EXECUTE on function public.similarity(text,text) to "anon";
grant EXECUTE on function public.similarity(text,text) to "authenticated";
grant EXECUTE on function public.similarity(text,text) to "postgres";
grant EXECUTE on function public.similarity(text,text) to "service_role";
grant EXECUTE on function public.similarity(text,text) to "supabase_admin";
grant EXECUTE on function public.spend_credits(uuid,integer) to "postgres";
grant EXECUTE on function public.spend_credits(uuid,integer) to "service_role";
grant EXECUTE on function public.start_v1_image_job(uuid) to "postgres";
grant EXECUTE on function public.start_v1_image_job(uuid) to "service_role";
grant EXECUTE on function public.strict_word_similarity_commutator_op(text,text) to public;
grant EXECUTE on function public.strict_word_similarity_commutator_op(text,text) to "anon";
grant EXECUTE on function public.strict_word_similarity_commutator_op(text,text) to "authenticated";
grant EXECUTE on function public.strict_word_similarity_commutator_op(text,text) to "postgres";
grant EXECUTE on function public.strict_word_similarity_commutator_op(text,text) to "service_role";
grant EXECUTE on function public.strict_word_similarity_commutator_op(text,text) to "supabase_admin";
grant EXECUTE on function public.strict_word_similarity_dist_commutator_op(text,text) to public;
grant EXECUTE on function public.strict_word_similarity_dist_commutator_op(text,text) to "anon";
grant EXECUTE on function public.strict_word_similarity_dist_commutator_op(text,text) to "authenticated";
grant EXECUTE on function public.strict_word_similarity_dist_commutator_op(text,text) to "postgres";
grant EXECUTE on function public.strict_word_similarity_dist_commutator_op(text,text) to "service_role";
grant EXECUTE on function public.strict_word_similarity_dist_commutator_op(text,text) to "supabase_admin";
grant EXECUTE on function public.strict_word_similarity_dist_op(text,text) to public;
grant EXECUTE on function public.strict_word_similarity_dist_op(text,text) to "anon";
grant EXECUTE on function public.strict_word_similarity_dist_op(text,text) to "authenticated";
grant EXECUTE on function public.strict_word_similarity_dist_op(text,text) to "postgres";
grant EXECUTE on function public.strict_word_similarity_dist_op(text,text) to "service_role";
grant EXECUTE on function public.strict_word_similarity_dist_op(text,text) to "supabase_admin";
grant EXECUTE on function public.strict_word_similarity_op(text,text) to public;
grant EXECUTE on function public.strict_word_similarity_op(text,text) to "anon";
grant EXECUTE on function public.strict_word_similarity_op(text,text) to "authenticated";
grant EXECUTE on function public.strict_word_similarity_op(text,text) to "postgres";
grant EXECUTE on function public.strict_word_similarity_op(text,text) to "service_role";
grant EXECUTE on function public.strict_word_similarity_op(text,text) to "supabase_admin";
grant EXECUTE on function public.strict_word_similarity(text,text) to public;
grant EXECUTE on function public.strict_word_similarity(text,text) to "anon";
grant EXECUTE on function public.strict_word_similarity(text,text) to "authenticated";
grant EXECUTE on function public.strict_word_similarity(text,text) to "postgres";
grant EXECUTE on function public.strict_word_similarity(text,text) to "service_role";
grant EXECUTE on function public.strict_word_similarity(text,text) to "supabase_admin";
grant EXECUTE on function public.sync_maro_preset_search_text() to public;
grant EXECUTE on function public.sync_maro_preset_search_text() to "postgres";
grant EXECUTE on function public.sync_maro_preset_search_text() to "service_role";
grant EXECUTE on function public.sync_profile_admin_flags() to "postgres";
grant EXECUTE on function public.toggle_creation_save(uuid,uuid,boolean) to "postgres";
grant EXECUTE on function public.toggle_creation_save(uuid,uuid,boolean) to "service_role";
grant EXECUTE on function public.transition_raiaccept_checkout(uuid,uuid,uuid,text,jsonb) to "postgres";
grant EXECUTE on function public.transition_raiaccept_checkout(uuid,uuid,uuid,text,jsonb) to "service_role";
grant EXECUTE on function public.v1_image_lifecycle_version() to "postgres";
grant EXECUTE on function public.v1_image_lifecycle_version() to "service_role";
grant EXECUTE on function public.v1_image_success_evidence(uuid) to "postgres";
grant EXECUTE on function public.v1_image_success_evidence(uuid) to "service_role";
grant EXECUTE on function public.word_similarity_commutator_op(text,text) to public;
grant EXECUTE on function public.word_similarity_commutator_op(text,text) to "anon";
grant EXECUTE on function public.word_similarity_commutator_op(text,text) to "authenticated";
grant EXECUTE on function public.word_similarity_commutator_op(text,text) to "postgres";
grant EXECUTE on function public.word_similarity_commutator_op(text,text) to "service_role";
grant EXECUTE on function public.word_similarity_commutator_op(text,text) to "supabase_admin";
grant EXECUTE on function public.word_similarity_dist_commutator_op(text,text) to public;
grant EXECUTE on function public.word_similarity_dist_commutator_op(text,text) to "anon";
grant EXECUTE on function public.word_similarity_dist_commutator_op(text,text) to "authenticated";
grant EXECUTE on function public.word_similarity_dist_commutator_op(text,text) to "postgres";
grant EXECUTE on function public.word_similarity_dist_commutator_op(text,text) to "service_role";
grant EXECUTE on function public.word_similarity_dist_commutator_op(text,text) to "supabase_admin";
grant EXECUTE on function public.word_similarity_dist_op(text,text) to public;
grant EXECUTE on function public.word_similarity_dist_op(text,text) to "anon";
grant EXECUTE on function public.word_similarity_dist_op(text,text) to "authenticated";
grant EXECUTE on function public.word_similarity_dist_op(text,text) to "postgres";
grant EXECUTE on function public.word_similarity_dist_op(text,text) to "service_role";
grant EXECUTE on function public.word_similarity_dist_op(text,text) to "supabase_admin";
grant EXECUTE on function public.word_similarity_op(text,text) to public;
grant EXECUTE on function public.word_similarity_op(text,text) to "anon";
grant EXECUTE on function public.word_similarity_op(text,text) to "authenticated";
grant EXECUTE on function public.word_similarity_op(text,text) to "postgres";
grant EXECUTE on function public.word_similarity_op(text,text) to "service_role";
grant EXECUTE on function public.word_similarity_op(text,text) to "supabase_admin";
grant EXECUTE on function public.word_similarity(text,text) to public;
grant EXECUTE on function public.word_similarity(text,text) to "anon";
grant EXECUTE on function public.word_similarity(text,text) to "authenticated";
grant EXECUTE on function public.word_similarity(text,text) to "postgres";
grant EXECUTE on function public.word_similarity(text,text) to "service_role";
grant EXECUTE on function public.word_similarity(text,text) to "supabase_admin";
CREATE INDEX IF NOT EXISTS abuse_events_created_idx ON public.abuse_events USING btree (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS abuse_events_pkey ON public.abuse_events USING btree (id);
CREATE INDEX IF NOT EXISTS abuse_events_user_idx ON public.abuse_events USING btree (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS app_settings_pkey ON public.app_settings USING btree (id);
CREATE INDEX IF NOT EXISTS audit_events_action_idx ON public.audit_events USING btree (action, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_actor_idx ON public.audit_events USING btree (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_created_idx ON public.audit_events USING btree (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS audit_events_pkey ON public.audit_events USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS brain_retention_files_pkey ON public.brain_retention_files USING btree (path);
CREATE UNIQUE INDEX IF NOT EXISTS budget_guards_pkey ON public.budget_guards USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS business_leads_pkey ON public.business_leads USING btree (id);
CREATE INDEX IF NOT EXISTS business_leads_status_idx ON public.business_leads USING btree (status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS challenge_entries_challenge_id_user_id_key ON public.challenge_entries USING btree (challenge_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS challenge_entries_pkey ON public.challenge_entries USING btree (id);
CREATE INDEX IF NOT EXISTS challenge_entries_score_idx ON public.challenge_entries USING btree (challenge_id, score DESC);
CREATE UNIQUE INDEX IF NOT EXISTS commerce_plans_pkey ON public.commerce_plans USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS commerce_topups_pkey ON public.commerce_topups USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS contest_submissions_contest_id_user_id_key ON public.contest_submissions USING btree (contest_id, user_id);
CREATE INDEX IF NOT EXISTS contest_submissions_contest_idx ON public.contest_submissions USING btree (contest_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS contest_submissions_pkey ON public.contest_submissions USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS contests_pkey ON public.contests USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS contests_slug_key ON public.contests USING btree (slug);
CREATE INDEX IF NOT EXISTS contests_status_idx ON public.contests USING btree (status, ends_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS creation_likes_pkey ON public.creation_likes USING btree (user_id, creation_id);
CREATE UNIQUE INDEX IF NOT EXISTS creation_saves_pkey ON public.creation_saves USING btree (user_id, creation_id);
CREATE UNIQUE INDEX IF NOT EXISTS creation_views_pkey ON public.creation_views USING btree (creation_id, visitor_hash, viewed_on);
CREATE UNIQUE INDEX IF NOT EXISTS creator_applications_pkey ON public.creator_applications USING btree (id);
CREATE INDEX IF NOT EXISTS creator_commissions_creator_idx ON public.creator_commissions USING btree (creator_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS creator_commissions_pkey ON public.creator_commissions USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS creator_follows_pkey ON public.creator_follows USING btree (follower_id, creator_id);
CREATE INDEX IF NOT EXISTS credit_orders_created_at_idx ON public.credit_orders USING btree (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS credit_orders_pkey ON public.credit_orders USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS credit_orders_provider_tx_unique_idx ON public.credit_orders USING btree (provider_transaction_id) WHERE (provider_transaction_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS paddle_paid_cycle_once ON public.credit_orders USING btree (paddle_subscription_id, paddle_period_start) WHERE ((provider = 'paddle'::text) AND (status = 'paid'::text) AND (paddle_subscription_id IS NOT NULL));
CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_idempotency_idx ON public.credit_transactions USING btree (user_id, idempotency_key, type) WHERE (idempotency_key IS NOT NULL);
CREATE INDEX IF NOT EXISTS credit_transactions_job_idx ON public.credit_transactions USING btree (job_id);
CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_one_charge_per_job_idx ON public.credit_transactions USING btree (job_id) WHERE ((type = 'charge'::text) AND (job_id IS NOT NULL));
CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_pkey ON public.credit_transactions USING btree (id);
CREATE INDEX IF NOT EXISTS credit_transactions_user_idx ON public.credit_transactions USING btree (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS data_retention_policies_pkey ON public.data_retention_policies USING btree (domain);
CREATE INDEX IF NOT EXISTS email_logs_created_idx ON public.email_logs USING btree (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS email_logs_pkey ON public.email_logs USING btree (id);
CREATE INDEX IF NOT EXISTS email_logs_template_idx ON public.email_logs USING btree (template_key, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS email_outbox_idempotency_key_key ON public.email_outbox USING btree (idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS email_outbox_pkey ON public.email_outbox USING btree (id);
CREATE INDEX IF NOT EXISTS email_outbox_status_scheduled_idx ON public.email_outbox USING btree (status, scheduled_at);
CREATE UNIQUE INDEX IF NOT EXISTS email_settings_pkey ON public.email_settings USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS email_template_versions_one_live_idx ON public.email_template_versions USING btree (template_id) WHERE (status = 'live'::text);
CREATE UNIQUE INDEX IF NOT EXISTS email_template_versions_pkey ON public.email_template_versions USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS email_template_versions_template_id_version_label_key ON public.email_template_versions USING btree (template_id, version_label);
CREATE INDEX IF NOT EXISTS email_template_versions_template_status_idx ON public.email_template_versions USING btree (template_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS email_templates_category_idx ON public.email_templates USING btree (category, locale, enabled);
CREATE UNIQUE INDEX IF NOT EXISTS email_templates_pkey ON public.email_templates USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS email_templates_template_key_locale_key ON public.email_templates USING btree (template_key, locale);
CREATE INDEX IF NOT EXISTS engine_internal_canary_users_enabled_idx ON public.engine_internal_canary_users USING btree (enabled) WHERE (enabled = true);
CREATE UNIQUE INDEX IF NOT EXISTS engine_internal_canary_users_pkey ON public.engine_internal_canary_users USING btree (user_id);
CREATE INDEX IF NOT EXISTS engine_shadow_comparisons_critical_idx ON public.engine_shadow_comparisons USING btree (tool_id, critical_mismatch, created_at DESC) WHERE (critical_mismatch = true);
CREATE INDEX IF NOT EXISTS engine_shadow_comparisons_generation_idx ON public.engine_shadow_comparisons USING btree (generation_id) WHERE (generation_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS engine_shadow_comparisons_pkey ON public.engine_shadow_comparisons USING btree (id);
CREATE INDEX IF NOT EXISTS engine_shadow_comparisons_review_idx ON public.engine_shadow_comparisons USING btree (tool_id, review_status, created_at DESC);
CREATE INDEX IF NOT EXISTS engine_shadow_comparisons_tool_created_idx ON public.engine_shadow_comparisons USING btree (tool_id, created_at DESC);
CREATE INDEX IF NOT EXISTS engine_shadow_comparisons_workspace_idx ON public.engine_shadow_comparisons USING btree (workspace_id, created_at DESC) WHERE (workspace_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS feature_flags_pkey ON public.feature_flags USING btree (key);
CREATE UNIQUE INDEX IF NOT EXISTS generation_internal_prompts_pkey ON public.generation_internal_prompts USING btree (generation_id);
CREATE UNIQUE INDEX IF NOT EXISTS generation_jobs_idempotency_active_idx ON public.generation_jobs USING btree (user_id, idempotency_key) WHERE ((idempotency_key IS NOT NULL) AND (status = ANY (ARRAY['pending'::text, 'reserved'::text, 'processing'::text])));
CREATE UNIQUE INDEX IF NOT EXISTS generation_jobs_pkey ON public.generation_jobs USING btree (id);
CREATE INDEX IF NOT EXISTS generation_jobs_status_created_idx ON public.generation_jobs USING btree (status, created_at);
CREATE INDEX IF NOT EXISTS generation_jobs_user_status_idx ON public.generation_jobs USING btree (user_id, status);
CREATE INDEX IF NOT EXISTS generations_conversation_idx ON public.generations USING btree (user_id, workspace_id, conversation_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS generations_one_per_job_idx ON public.generations USING btree (job_id) WHERE (job_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS generations_pkey ON public.generations USING btree (id);
CREATE INDEX IF NOT EXISTS generations_workspace_idx ON public.generations USING btree (user_id, workspace_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS help_articles_pkey ON public.help_articles USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS help_articles_slug_key ON public.help_articles USING btree (slug);
CREATE INDEX IF NOT EXISTS launch_waitlist_created_at_idx ON public.launch_waitlist USING btree (created_at, id);
CREATE UNIQUE INDEX IF NOT EXISTS launch_waitlist_email_unique ON public.launch_waitlist USING btree (email);
CREATE UNIQUE INDEX IF NOT EXISTS launch_waitlist_pkey ON public.launch_waitlist USING btree (id);
CREATE INDEX IF NOT EXISTS login_ads_active_weight_idx ON public.login_ads USING btree (active, weight DESC, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS login_ads_pkey ON public.login_ads USING btree (id);
CREATE INDEX IF NOT EXISTS maro_prompts_active_idx ON public.maro_prompts USING btree (active);
CREATE INDEX IF NOT EXISTS maro_prompts_browse_idx ON public.maro_prompts USING btree (tool, status, active, featured DESC, sort_order, created_at DESC);
CREATE INDEX IF NOT EXISTS maro_prompts_category_id_idx ON public.maro_prompts USING btree (category_id);
CREATE INDEX IF NOT EXISTS maro_prompts_category_idx ON public.maro_prompts USING btree (category);
CREATE UNIQUE INDEX IF NOT EXISTS maro_prompts_code_key ON public.maro_prompts USING btree (code);
CREATE INDEX IF NOT EXISTS maro_prompts_created_at_idx ON public.maro_prompts USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS maro_prompts_marketing_idx ON public.maro_prompts USING btree (marketing) WHERE marketing;
CREATE UNIQUE INDEX IF NOT EXISTS maro_prompts_pkey ON public.maro_prompts USING btree (id);
CREATE INDEX IF NOT EXISTS maro_prompts_preset_category_idx ON public.maro_prompts USING btree (preset_category);
CREATE INDEX IF NOT EXISTS maro_prompts_search_trgm_idx ON public.maro_prompts USING gin (search_text gin_trgm_ops);
CREATE UNIQUE INDEX IF NOT EXISTS maro_prompts_slug_idx ON public.maro_prompts USING btree (slug);
CREATE INDEX IF NOT EXISTS maro_prompts_tool_category_idx ON public.maro_prompts USING btree (tool, category, status) WHERE active;
CREATE UNIQUE INDEX IF NOT EXISTS memberships_paddle_subscription_id_key ON public.memberships USING btree (paddle_subscription_id);
CREATE UNIQUE INDEX IF NOT EXISTS memberships_pkey ON public.memberships USING btree (id);
CREATE INDEX IF NOT EXISTS memberships_user_expires_idx ON public.memberships USING btree (user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS notification_campaigns_active_idx ON public.notification_campaigns USING btree (active, kind, starts_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS notification_campaigns_pkey ON public.notification_campaigns USING btree (id);
CREATE INDEX IF NOT EXISTS notification_campaigns_placement_order_idx ON public.notification_campaigns USING btree (kind, active, priority DESC, created_at DESC) WHERE (archived_at IS NULL);
CREATE UNIQUE INDEX IF NOT EXISTS notification_dismissals_pkey ON public.notification_dismissals USING btree (user_id, campaign_id);
CREATE UNIQUE INDEX IF NOT EXISTS paddle_webhook_events_pkey ON public.paddle_webhook_events USING btree (event_id);
CREATE UNIQUE INDEX IF NOT EXISTS platform_spend_rollup_pkey ON public.platform_spend_rollup USING btree (bucket_start, bucket_type, user_id, module);
CREATE UNIQUE INDEX IF NOT EXISTS preset_categories_pkey ON public.preset_categories USING btree (id);
CREATE INDEX IF NOT EXISTS preset_categories_tool_order_idx ON public.preset_categories USING btree (tool, active, sort_order, label);
CREATE UNIQUE INDEX IF NOT EXISTS preset_categories_tool_slug_idx ON public.preset_categories USING btree (tool, slug);
CREATE INDEX IF NOT EXISTS pricing_snapshots_generation_idx ON public.pricing_snapshots USING btree (generation_id);
CREATE UNIQUE INDEX IF NOT EXISTS pricing_snapshots_pkey ON public.pricing_snapshots USING btree (id);
CREATE INDEX IF NOT EXISTS product_events_name_created_idx ON public.product_events USING btree (event_name, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS product_events_pkey ON public.product_events USING btree (id);
CREATE INDEX IF NOT EXISTS product_events_user_idx ON public.product_events USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS profiles_access_role_idx ON public.profiles USING btree (access_role) WHERE (access_role IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_pkey ON public.profiles USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles USING btree (lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS promo_codes_code_key ON public.promo_codes USING btree (code);
CREATE UNIQUE INDEX IF NOT EXISTS promo_codes_pkey ON public.promo_codes USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS promo_codes_slug_key ON public.promo_codes USING btree (slug);
CREATE INDEX IF NOT EXISTS promo_events_code_idx ON public.promo_events USING btree (code);
CREATE UNIQUE INDEX IF NOT EXISTS promo_events_pkey ON public.promo_events USING btree (id);
CREATE INDEX IF NOT EXISTS prompt_events_created_at_idx ON public.prompt_events USING btree (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS prompt_events_pkey ON public.prompt_events USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS prompt_layers_pkey ON public.prompt_layers USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS prompt_layers_tool_id_layer_key_key ON public.prompt_layers USING btree (tool_id, layer_key);
CREATE INDEX IF NOT EXISTS prompt_layers_tool_live_idx ON public.prompt_layers USING btree (tool_id, status, priority DESC);
CREATE UNIQUE INDEX IF NOT EXISTS prompt_likes_pkey ON public.prompt_likes USING btree (user_id, prompt_id);
CREATE INDEX IF NOT EXISTS prompt_reveals_created_at_idx ON public.prompt_reveals USING btree (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS prompt_reveals_pkey ON public.prompt_reveals USING btree (user_id, prompt_id);
CREATE INDEX IF NOT EXISTS provider_cost_estimates_created_idx ON public.provider_cost_estimates USING btree (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS provider_cost_estimates_pkey ON public.provider_cost_estimates USING btree (id);
CREATE INDEX IF NOT EXISTS provider_cost_estimates_tool_idx ON public.provider_cost_estimates USING btree (tool_id, created_at DESC);
CREATE INDEX IF NOT EXISTS public_creations_author_idx ON public.public_creations USING btree (user_id, created_at DESC) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS public_creations_created_at_idx ON public.public_creations USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS public_creations_featured_idx ON public.public_creations USING btree (featured) WHERE featured;
CREATE INDEX IF NOT EXISTS public_creations_like_count_idx ON public.public_creations USING btree (like_count DESC);
CREATE UNIQUE INDEX IF NOT EXISTS public_creations_pkey ON public.public_creations USING btree (id);
CREATE INDEX IF NOT EXISTS public_creations_save_count_idx ON public.public_creations USING btree (save_count DESC) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS public_creations_slug_idx ON public.public_creations USING btree (slug);
CREATE UNIQUE INDEX IF NOT EXISTS public_creations_slug_key ON public.public_creations USING btree (slug);
CREATE INDEX IF NOT EXISTS public_creations_view_count_idx ON public.public_creations USING btree (view_count DESC) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX IF NOT EXISTS raiaccept_checkouts_environment_merchant_account_id_merchan_key ON public.raiaccept_checkouts USING btree (environment, merchant_account_id, merchant_reference);
CREATE UNIQUE INDEX IF NOT EXISTS raiaccept_checkouts_environment_merchant_account_id_provide_key ON public.raiaccept_checkouts USING btree (environment, merchant_account_id, provider_order_id);
CREATE UNIQUE INDEX IF NOT EXISTS raiaccept_checkouts_pkey ON public.raiaccept_checkouts USING btree (order_id);
CREATE UNIQUE INDEX IF NOT EXISTS raiaccept_checkouts_user_id_environment_request_key_key ON public.raiaccept_checkouts USING btree (user_id, environment, request_key);
CREATE UNIQUE INDEX IF NOT EXISTS raiaccept_membership_checkout_once ON public.raiaccept_checkouts USING btree (user_id, environment) WHERE holds_membership;
CREATE INDEX IF NOT EXISTS raiaccept_verification_due ON public.raiaccept_checkouts USING btree (next_check_at) WHERE (next_check_at IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS raiaccept_receipt_jobs_pkey ON public.raiaccept_receipt_jobs USING btree (order_id);
CREATE UNIQUE INDEX IF NOT EXISTS raiaccept_verification_queue_pkey ON public.raiaccept_verification_queue USING btree (order_id);
CREATE UNIQUE INDEX IF NOT EXISTS raiaccept_verified_payments_pkey ON public.raiaccept_verified_payments USING btree (environment, merchant_account_id, transaction_id);
CREATE INDEX IF NOT EXISTS rate_limit_events_lookup_idx ON public.rate_limit_events USING btree (scope, scope_key, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS rate_limit_events_pkey ON public.rate_limit_events USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS refund_records_pkey ON public.refund_records USING btree (id);
CREATE INDEX IF NOT EXISTS refund_records_status_idx ON public.refund_records USING btree (status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS reports_pkey ON public.reports USING btree (id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports USING btree (status);
CREATE UNIQUE INDEX IF NOT EXISTS retention_execution_runs_pkey ON public.retention_execution_runs USING btree (id);
CREATE INDEX IF NOT EXISTS retention_execution_runs_started_idx ON public.retention_execution_runs USING btree (started_at DESC);
CREATE INDEX IF NOT EXISTS security_events_created_idx ON public.security_events USING btree (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS security_events_pkey ON public.security_events USING btree (id);
CREATE INDEX IF NOT EXISTS security_events_type_idx ON public.security_events USING btree (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS signup_signals_ip_idx ON public.signup_signals USING btree (ip, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS signup_signals_pkey ON public.signup_signals USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS storage_usage_pkey ON public.storage_usage USING btree (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS support_ticket_messages_pkey ON public.support_ticket_messages USING btree (id);
CREATE INDEX IF NOT EXISTS support_ticket_messages_ticket_idx ON public.support_ticket_messages USING btree (ticket_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS support_tickets_pkey ON public.support_tickets USING btree (id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON public.support_tickets USING btree (status, created_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_user_idx ON public.support_tickets USING btree (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS system_prompt_versions_one_live_idx ON public.system_prompt_versions USING btree (tool_id) WHERE (status = 'live'::text);
CREATE UNIQUE INDEX IF NOT EXISTS system_prompt_versions_pkey ON public.system_prompt_versions USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS system_prompt_versions_tool_id_version_label_key ON public.system_prompt_versions USING btree (tool_id, version_label);
CREATE INDEX IF NOT EXISTS system_prompt_versions_tool_status_idx ON public.system_prompt_versions USING btree (tool_id, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS tool_engine_config_pkey ON public.tool_engine_config USING btree (tool_id);
CREATE UNIQUE INDEX IF NOT EXISTS tool_input_fields_pkey ON public.tool_input_fields USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS tool_input_fields_tool_id_field_key_key ON public.tool_input_fields USING btree (tool_id, field_key);
CREATE INDEX IF NOT EXISTS tool_input_fields_tool_order_idx ON public.tool_input_fields USING btree (tool_id, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS tool_model_configs_one_default_idx ON public.tool_model_configs USING btree (tool_id) WHERE (is_default = true);
CREATE UNIQUE INDEX IF NOT EXISTS tool_model_configs_pkey ON public.tool_model_configs USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS tool_model_configs_tool_id_model_id_key ON public.tool_model_configs USING btree (tool_id, model_id);
CREATE UNIQUE INDEX IF NOT EXISTS user_notifications_pkey ON public.user_notifications USING btree (id);
CREATE INDEX IF NOT EXISTS user_notifications_user_created_idx ON public.user_notifications USING btree (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS user_notifications_user_id_dedupe_key_key ON public.user_notifications USING btree (user_id, dedupe_key);
CREATE UNIQUE INDEX IF NOT EXISTS weekly_challenges_pkey ON public.weekly_challenges USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS weekly_challenges_slug_key ON public.weekly_challenges USING btree (slug);
CREATE UNIQUE INDEX IF NOT EXISTS workspace_sources_pkey ON public.workspace_sources USING btree (id);
CREATE INDEX IF NOT EXISTS workspace_sources_ws_idx ON public.workspace_sources USING btree (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS workspaces_owner_idx ON public.workspaces USING btree (owner_id, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS workspaces_pkey ON public.workspaces USING btree (id);
alter table public."abuse_events" enable row level security;
alter table public."app_settings" enable row level security;
alter table public."audit_events" enable row level security;
alter table public."brain_retention_files" enable row level security;
alter table public."budget_guards" enable row level security;
alter table public."business_leads" enable row level security;
alter table public."challenge_entries" enable row level security;
alter table public."commerce_plans" enable row level security;
alter table public."commerce_topups" enable row level security;
alter table public."contest_submissions" enable row level security;
alter table public."contests" enable row level security;
alter table public."creation_likes" enable row level security;
alter table public."creation_saves" enable row level security;
alter table public."creation_views" enable row level security;
alter table public."creator_applications" enable row level security;
alter table public."creator_commissions" enable row level security;
alter table public."creator_follows" enable row level security;
alter table public."credit_orders" enable row level security;
alter table public."credit_transactions" enable row level security;
alter table public."data_retention_policies" enable row level security;
alter table public."email_logs" enable row level security;
alter table public."email_outbox" enable row level security;
alter table public."email_settings" enable row level security;
alter table public."email_template_versions" enable row level security;
alter table public."email_templates" enable row level security;
alter table public."engine_internal_canary_users" enable row level security;
alter table public."engine_shadow_comparisons" enable row level security;
alter table public."feature_flags" enable row level security;
alter table public."generation_internal_prompts" enable row level security;
alter table public."generation_jobs" enable row level security;
alter table public."generations" enable row level security;
alter table public."help_articles" enable row level security;
alter table public."launch_waitlist" enable row level security;
alter table public."login_ads" enable row level security;
alter table public."maro_prompts" enable row level security;
alter table public."memberships" enable row level security;
alter table public."notification_campaigns" enable row level security;
alter table public."notification_dismissals" enable row level security;
alter table public."paddle_webhook_events" enable row level security;
alter table public."platform_spend_rollup" enable row level security;
alter table public."preset_categories" enable row level security;
alter table public."pricing_snapshots" enable row level security;
alter table public."product_events" enable row level security;
alter table public."profiles" enable row level security;
alter table public."promo_codes" enable row level security;
alter table public."promo_events" enable row level security;
alter table public."prompt_events" enable row level security;
alter table public."prompt_layers" enable row level security;
alter table public."prompt_likes" enable row level security;
alter table public."prompt_reveals" enable row level security;
alter table public."provider_cost_estimates" enable row level security;
alter table public."public_creations" enable row level security;
alter table public."raiaccept_checkouts" enable row level security;
alter table public."raiaccept_receipt_jobs" enable row level security;
alter table public."raiaccept_verification_queue" enable row level security;
alter table public."raiaccept_verified_payments" enable row level security;
alter table public."rate_limit_events" enable row level security;
alter table public."refund_records" enable row level security;
alter table public."reports" enable row level security;
alter table public."retention_execution_runs" enable row level security;
alter table public."security_events" enable row level security;
alter table public."signup_signals" enable row level security;
alter table public."storage_usage" enable row level security;
alter table public."support_ticket_messages" enable row level security;
alter table public."support_tickets" enable row level security;
alter table public."system_prompt_versions" enable row level security;
alter table public."tool_engine_config" enable row level security;
alter table public."tool_input_fields" enable row level security;
alter table public."tool_model_configs" enable row level security;
alter table public."user_notifications" enable row level security;
alter table public."weekly_challenges" enable row level security;
alter table public."workspace_sources" enable row level security;
alter table public."workspaces" enable row level security;
create policy "abuse_events_admin" on public."abuse_events" for SELECT to public using (is_admin());
create policy "settings_admin_update" on public."app_settings" for UPDATE to public using (is_admin());
create policy "settings_select" on public."app_settings" for SELECT to public using ((auth.role() = 'authenticated'::text));
create policy "audit_events_admin_select" on public."audit_events" for SELECT to public using (has_admin_access());
create policy "budget_guards_admin" on public."budget_guards" for ALL to public using (has_admin_access()) with check (has_admin_access());
create policy "business_leads_admin" on public."business_leads" for ALL to public using (has_admin_access()) with check (has_admin_access());
create policy "business_leads_user_select" on public."business_leads" for SELECT to public using ((auth.uid() = user_id));
create policy "commerce_plans_admin_write" on public."commerce_plans" for ALL to public using (has_admin_access()) with check (has_admin_access());
create policy "commerce_plans_public_read" on public."commerce_plans" for SELECT to public using (((enabled = true) OR has_admin_access()));
create policy "commerce_topups_admin_write" on public."commerce_topups" for ALL to public using (has_admin_access()) with check (has_admin_access());
create policy "commerce_topups_public_read" on public."commerce_topups" for SELECT to public using (((enabled = true) OR has_admin_access()));
create policy "creator apply admin" on public."creator_applications" for ALL to public using (is_admin()) with check (is_admin());
create policy "creator apply insert" on public."creator_applications" for INSERT to public with check (true);
create policy "creator_commissions_admin" on public."creator_commissions" for SELECT to public using ((has_admin_access() OR (auth.uid() = creator_id)));
create policy "credit_tx_user_select" on public."credit_transactions" for SELECT to public using (((auth.uid() = user_id) OR is_admin()));
create policy "data_retention_admin" on public."data_retention_policies" for SELECT to public using (has_admin_access());
create policy "email_logs_admin_select" on public."email_logs" for SELECT to public using (has_admin_access());
create policy "email_settings_admin" on public."email_settings" for ALL to public using (has_admin_access()) with check (has_admin_access());
create policy "email_template_versions_admin" on public."email_template_versions" for ALL to public using (has_admin_access()) with check (has_admin_access());
create policy "email_templates_admin" on public."email_templates" for ALL to public using (has_admin_access()) with check (has_admin_access());
create policy "engine_shadow_comparisons_admin_select" on public."engine_shadow_comparisons" for SELECT to public using (has_admin_access());
create policy "jobs_user_select" on public."generation_jobs" for SELECT to public using (((auth.uid() = user_id) OR is_admin()));
create policy "generations_select" on public."generations" for SELECT to public using (((auth.uid() = user_id) OR is_admin()));
create policy "help_articles_admin" on public."help_articles" for ALL to public using (has_admin_access()) with check (has_admin_access());
create policy "help_articles_public_read" on public."help_articles" for SELECT to public using ((published = true));
create policy "memberships_admin_all" on public."memberships" for ALL to public using (has_admin_access()) with check (has_admin_access());
create policy "memberships_user_select" on public."memberships" for SELECT to public using (((auth.uid() = user_id) OR has_admin_access()));
create policy "notification_campaigns_admin" on public."notification_campaigns" for ALL to public using (has_admin_access()) with check (has_admin_access());
create policy "notification_campaigns_public_read" on public."notification_campaigns" for SELECT to public using (((active = true) AND ((starts_at IS NULL) OR (starts_at <= now())) AND ((ends_at IS NULL) OR (ends_at > now()))));
create policy "notification_dismissals_own" on public."notification_dismissals" for ALL to public using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy "preset_categories_admin_all" on public."preset_categories" for ALL to public using (has_admin_access()) with check (has_admin_access());
create policy "preset_categories_public_read" on public."preset_categories" for SELECT to public using ((active = true));
create policy "pricing_snapshots_admin" on public."pricing_snapshots" for SELECT to public using (has_admin_access());
create policy "product_events_admin_select" on public."product_events" for SELECT to public using (has_admin_access());
create policy "profiles_admin_update" on public."profiles" for UPDATE to public using (is_admin());
create policy "profiles_select" on public."profiles" for SELECT to public using (((auth.uid() = id) OR is_admin()));
create policy "promo admin write" on public."promo_codes" for ALL to public using (is_admin()) with check (is_admin());
create policy "promo read active" on public."promo_codes" for SELECT to public using ((active OR is_admin()));
create policy "promo events admin read" on public."promo_events" for SELECT to public using (is_admin());
create policy "prompt_events_admin_select" on public."prompt_events" for SELECT to public using (has_admin_access());
create policy "prompt_layers_admin_select" on public."prompt_layers" for SELECT to public using (has_admin_access());
create policy "provider_cost_admin" on public."provider_cost_estimates" for SELECT to public using (has_admin_access());
create policy "refund_records_admin" on public."refund_records" for ALL to public using (has_admin_access()) with check (has_admin_access());
create policy "reports admin update" on public."reports" for UPDATE to public using (is_admin()) with check (is_admin());
create policy "reports insert own" on public."reports" for INSERT to public with check ((auth.uid() = user_id));
create policy "reports read own or admin" on public."reports" for SELECT to public using (((auth.uid() = user_id) OR is_admin()));
create policy "retention_runs_admin" on public."retention_execution_runs" for SELECT to public using (has_admin_access());
create policy "security_events_admin" on public."security_events" for SELECT to public using (has_admin_access());
create policy "signup_signals_admin" on public."signup_signals" for SELECT to public using (is_admin());
create policy "storage_usage_user" on public."storage_usage" for SELECT to public using (((auth.uid() = user_id) OR is_admin()));
create policy "support_messages_read" on public."support_ticket_messages" for SELECT to public using ((has_admin_access() OR (EXISTS ( SELECT 1
   FROM support_tickets t
  WHERE ((t.id = support_ticket_messages.ticket_id) AND (t.user_id = auth.uid()) AND (support_ticket_messages.internal = false))))));
create policy "support_tickets_admin_update" on public."support_tickets" for UPDATE to public using (has_admin_access()) with check (has_admin_access());
create policy "support_tickets_user_insert" on public."support_tickets" for INSERT to public with check ((auth.uid() = user_id));
create policy "support_tickets_user_read" on public."support_tickets" for SELECT to public using (((auth.uid() = user_id) OR has_admin_access()));
create policy "system_prompt_versions_admin_select" on public."system_prompt_versions" for SELECT to public using (has_admin_access());
create policy "tool_engine_config_admin_select" on public."tool_engine_config" for SELECT to public using (has_admin_access());
create policy "tool_input_fields_admin_select" on public."tool_input_fields" for SELECT to public using (has_admin_access());
create policy "tool_model_configs_admin_select" on public."tool_model_configs" for SELECT to public using (has_admin_access());
create policy "user_notifications_admin_insert" on public."user_notifications" for INSERT to public with check ((has_admin_access() OR (auth.uid() = user_id)));
create policy "user_notifications_own" on public."user_notifications" for SELECT to public using (((auth.uid() = user_id) OR has_admin_access()));
create policy "user_notifications_own_update" on public."user_notifications" for UPDATE to public using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy "workspace_sources_owner_all" on public."workspace_sources" for ALL to public using (((auth.uid() = owner_id) AND maro_brain_allowed())) with check (((auth.uid() = owner_id) AND maro_brain_allowed() AND (EXISTS ( SELECT 1
   FROM workspaces w
  WHERE ((w.id = workspace_sources.workspace_id) AND (w.owner_id = auth.uid()))))));
create policy "workspaces_owner_all" on public."workspaces" for ALL to public using ((auth.uid() = owner_id)) with check ((auth.uid() = owner_id));
grant DELETE on public."abuse_events" to "anon";
grant INSERT on public."abuse_events" to "anon";
grant REFERENCES on public."abuse_events" to "anon";
grant SELECT on public."abuse_events" to "anon";
grant TRIGGER on public."abuse_events" to "anon";
grant TRUNCATE on public."abuse_events" to "anon";
grant UPDATE on public."abuse_events" to "anon";
grant DELETE on public."abuse_events" to "authenticated";
grant INSERT on public."abuse_events" to "authenticated";
grant REFERENCES on public."abuse_events" to "authenticated";
grant SELECT on public."abuse_events" to "authenticated";
grant TRIGGER on public."abuse_events" to "authenticated";
grant TRUNCATE on public."abuse_events" to "authenticated";
grant UPDATE on public."abuse_events" to "authenticated";
grant DELETE on public."abuse_events" to "service_role";
grant INSERT on public."abuse_events" to "service_role";
grant REFERENCES on public."abuse_events" to "service_role";
grant SELECT on public."abuse_events" to "service_role";
grant TRIGGER on public."abuse_events" to "service_role";
grant TRUNCATE on public."abuse_events" to "service_role";
grant UPDATE on public."abuse_events" to "service_role";
grant DELETE on public."app_settings" to "anon";
grant INSERT on public."app_settings" to "anon";
grant REFERENCES on public."app_settings" to "anon";
grant SELECT on public."app_settings" to "anon";
grant TRIGGER on public."app_settings" to "anon";
grant TRUNCATE on public."app_settings" to "anon";
grant UPDATE on public."app_settings" to "anon";
grant DELETE on public."app_settings" to "authenticated";
grant INSERT on public."app_settings" to "authenticated";
grant REFERENCES on public."app_settings" to "authenticated";
grant SELECT on public."app_settings" to "authenticated";
grant TRIGGER on public."app_settings" to "authenticated";
grant TRUNCATE on public."app_settings" to "authenticated";
grant UPDATE on public."app_settings" to "authenticated";
grant DELETE on public."app_settings" to "service_role";
grant INSERT on public."app_settings" to "service_role";
grant REFERENCES on public."app_settings" to "service_role";
grant SELECT on public."app_settings" to "service_role";
grant TRIGGER on public."app_settings" to "service_role";
grant TRUNCATE on public."app_settings" to "service_role";
grant UPDATE on public."app_settings" to "service_role";
grant DELETE on public."audit_events" to "anon";
grant INSERT on public."audit_events" to "anon";
grant REFERENCES on public."audit_events" to "anon";
grant SELECT on public."audit_events" to "anon";
grant TRIGGER on public."audit_events" to "anon";
grant TRUNCATE on public."audit_events" to "anon";
grant UPDATE on public."audit_events" to "anon";
grant DELETE on public."audit_events" to "authenticated";
grant INSERT on public."audit_events" to "authenticated";
grant REFERENCES on public."audit_events" to "authenticated";
grant SELECT on public."audit_events" to "authenticated";
grant TRIGGER on public."audit_events" to "authenticated";
grant TRUNCATE on public."audit_events" to "authenticated";
grant UPDATE on public."audit_events" to "authenticated";
grant DELETE on public."audit_events" to "service_role";
grant INSERT on public."audit_events" to "service_role";
grant REFERENCES on public."audit_events" to "service_role";
grant SELECT on public."audit_events" to "service_role";
grant TRIGGER on public."audit_events" to "service_role";
grant TRUNCATE on public."audit_events" to "service_role";
grant UPDATE on public."audit_events" to "service_role";
grant DELETE on public."brain_retention_files" to "service_role";
grant INSERT on public."brain_retention_files" to "service_role";
grant REFERENCES on public."brain_retention_files" to "service_role";
grant SELECT on public."brain_retention_files" to "service_role";
grant TRIGGER on public."brain_retention_files" to "service_role";
grant TRUNCATE on public."brain_retention_files" to "service_role";
grant UPDATE on public."brain_retention_files" to "service_role";
grant DELETE on public."budget_guards" to "anon";
grant INSERT on public."budget_guards" to "anon";
grant REFERENCES on public."budget_guards" to "anon";
grant SELECT on public."budget_guards" to "anon";
grant TRIGGER on public."budget_guards" to "anon";
grant TRUNCATE on public."budget_guards" to "anon";
grant UPDATE on public."budget_guards" to "anon";
grant DELETE on public."budget_guards" to "authenticated";
grant INSERT on public."budget_guards" to "authenticated";
grant REFERENCES on public."budget_guards" to "authenticated";
grant SELECT on public."budget_guards" to "authenticated";
grant TRIGGER on public."budget_guards" to "authenticated";
grant TRUNCATE on public."budget_guards" to "authenticated";
grant UPDATE on public."budget_guards" to "authenticated";
grant DELETE on public."budget_guards" to "service_role";
grant INSERT on public."budget_guards" to "service_role";
grant REFERENCES on public."budget_guards" to "service_role";
grant SELECT on public."budget_guards" to "service_role";
grant TRIGGER on public."budget_guards" to "service_role";
grant TRUNCATE on public."budget_guards" to "service_role";
grant UPDATE on public."budget_guards" to "service_role";
grant DELETE on public."business_leads" to "anon";
grant INSERT on public."business_leads" to "anon";
grant REFERENCES on public."business_leads" to "anon";
grant SELECT on public."business_leads" to "anon";
grant TRIGGER on public."business_leads" to "anon";
grant TRUNCATE on public."business_leads" to "anon";
grant UPDATE on public."business_leads" to "anon";
grant DELETE on public."business_leads" to "authenticated";
grant INSERT on public."business_leads" to "authenticated";
grant REFERENCES on public."business_leads" to "authenticated";
grant SELECT on public."business_leads" to "authenticated";
grant TRIGGER on public."business_leads" to "authenticated";
grant TRUNCATE on public."business_leads" to "authenticated";
grant UPDATE on public."business_leads" to "authenticated";
grant DELETE on public."business_leads" to "service_role";
grant INSERT on public."business_leads" to "service_role";
grant REFERENCES on public."business_leads" to "service_role";
grant SELECT on public."business_leads" to "service_role";
grant TRIGGER on public."business_leads" to "service_role";
grant TRUNCATE on public."business_leads" to "service_role";
grant UPDATE on public."business_leads" to "service_role";
grant DELETE on public."challenge_entries" to "anon";
grant INSERT on public."challenge_entries" to "anon";
grant REFERENCES on public."challenge_entries" to "anon";
grant SELECT on public."challenge_entries" to "anon";
grant TRIGGER on public."challenge_entries" to "anon";
grant TRUNCATE on public."challenge_entries" to "anon";
grant UPDATE on public."challenge_entries" to "anon";
grant DELETE on public."challenge_entries" to "authenticated";
grant INSERT on public."challenge_entries" to "authenticated";
grant REFERENCES on public."challenge_entries" to "authenticated";
grant SELECT on public."challenge_entries" to "authenticated";
grant TRIGGER on public."challenge_entries" to "authenticated";
grant TRUNCATE on public."challenge_entries" to "authenticated";
grant UPDATE on public."challenge_entries" to "authenticated";
grant DELETE on public."challenge_entries" to "service_role";
grant INSERT on public."challenge_entries" to "service_role";
grant REFERENCES on public."challenge_entries" to "service_role";
grant SELECT on public."challenge_entries" to "service_role";
grant TRIGGER on public."challenge_entries" to "service_role";
grant TRUNCATE on public."challenge_entries" to "service_role";
grant UPDATE on public."challenge_entries" to "service_role";
grant DELETE on public."commerce_plans" to "anon";
grant INSERT on public."commerce_plans" to "anon";
grant REFERENCES on public."commerce_plans" to "anon";
grant SELECT on public."commerce_plans" to "anon";
grant TRIGGER on public."commerce_plans" to "anon";
grant TRUNCATE on public."commerce_plans" to "anon";
grant UPDATE on public."commerce_plans" to "anon";
grant DELETE on public."commerce_plans" to "authenticated";
grant INSERT on public."commerce_plans" to "authenticated";
grant REFERENCES on public."commerce_plans" to "authenticated";
grant SELECT on public."commerce_plans" to "authenticated";
grant TRIGGER on public."commerce_plans" to "authenticated";
grant TRUNCATE on public."commerce_plans" to "authenticated";
grant UPDATE on public."commerce_plans" to "authenticated";
grant DELETE on public."commerce_plans" to "service_role";
grant INSERT on public."commerce_plans" to "service_role";
grant REFERENCES on public."commerce_plans" to "service_role";
grant SELECT on public."commerce_plans" to "service_role";
grant TRIGGER on public."commerce_plans" to "service_role";
grant TRUNCATE on public."commerce_plans" to "service_role";
grant UPDATE on public."commerce_plans" to "service_role";
grant DELETE on public."commerce_topups" to "anon";
grant INSERT on public."commerce_topups" to "anon";
grant REFERENCES on public."commerce_topups" to "anon";
grant SELECT on public."commerce_topups" to "anon";
grant TRIGGER on public."commerce_topups" to "anon";
grant TRUNCATE on public."commerce_topups" to "anon";
grant UPDATE on public."commerce_topups" to "anon";
grant DELETE on public."commerce_topups" to "authenticated";
grant INSERT on public."commerce_topups" to "authenticated";
grant REFERENCES on public."commerce_topups" to "authenticated";
grant SELECT on public."commerce_topups" to "authenticated";
grant TRIGGER on public."commerce_topups" to "authenticated";
grant TRUNCATE on public."commerce_topups" to "authenticated";
grant UPDATE on public."commerce_topups" to "authenticated";
grant DELETE on public."commerce_topups" to "service_role";
grant INSERT on public."commerce_topups" to "service_role";
grant REFERENCES on public."commerce_topups" to "service_role";
grant SELECT on public."commerce_topups" to "service_role";
grant TRIGGER on public."commerce_topups" to "service_role";
grant TRUNCATE on public."commerce_topups" to "service_role";
grant UPDATE on public."commerce_topups" to "service_role";
grant DELETE on public."contest_submissions" to "anon";
grant INSERT on public."contest_submissions" to "anon";
grant REFERENCES on public."contest_submissions" to "anon";
grant SELECT on public."contest_submissions" to "anon";
grant TRIGGER on public."contest_submissions" to "anon";
grant TRUNCATE on public."contest_submissions" to "anon";
grant UPDATE on public."contest_submissions" to "anon";
grant DELETE on public."contest_submissions" to "authenticated";
grant INSERT on public."contest_submissions" to "authenticated";
grant REFERENCES on public."contest_submissions" to "authenticated";
grant SELECT on public."contest_submissions" to "authenticated";
grant TRIGGER on public."contest_submissions" to "authenticated";
grant TRUNCATE on public."contest_submissions" to "authenticated";
grant UPDATE on public."contest_submissions" to "authenticated";
grant DELETE on public."contest_submissions" to "service_role";
grant INSERT on public."contest_submissions" to "service_role";
grant REFERENCES on public."contest_submissions" to "service_role";
grant SELECT on public."contest_submissions" to "service_role";
grant TRIGGER on public."contest_submissions" to "service_role";
grant TRUNCATE on public."contest_submissions" to "service_role";
grant UPDATE on public."contest_submissions" to "service_role";
grant DELETE on public."contests" to "anon";
grant INSERT on public."contests" to "anon";
grant REFERENCES on public."contests" to "anon";
grant SELECT on public."contests" to "anon";
grant TRIGGER on public."contests" to "anon";
grant TRUNCATE on public."contests" to "anon";
grant UPDATE on public."contests" to "anon";
grant DELETE on public."contests" to "authenticated";
grant INSERT on public."contests" to "authenticated";
grant REFERENCES on public."contests" to "authenticated";
grant SELECT on public."contests" to "authenticated";
grant TRIGGER on public."contests" to "authenticated";
grant TRUNCATE on public."contests" to "authenticated";
grant UPDATE on public."contests" to "authenticated";
grant DELETE on public."contests" to "service_role";
grant INSERT on public."contests" to "service_role";
grant REFERENCES on public."contests" to "service_role";
grant SELECT on public."contests" to "service_role";
grant TRIGGER on public."contests" to "service_role";
grant TRUNCATE on public."contests" to "service_role";
grant UPDATE on public."contests" to "service_role";
grant DELETE on public."creation_likes" to "anon";
grant INSERT on public."creation_likes" to "anon";
grant REFERENCES on public."creation_likes" to "anon";
grant SELECT on public."creation_likes" to "anon";
grant TRIGGER on public."creation_likes" to "anon";
grant TRUNCATE on public."creation_likes" to "anon";
grant UPDATE on public."creation_likes" to "anon";
grant DELETE on public."creation_likes" to "authenticated";
grant INSERT on public."creation_likes" to "authenticated";
grant REFERENCES on public."creation_likes" to "authenticated";
grant SELECT on public."creation_likes" to "authenticated";
grant TRIGGER on public."creation_likes" to "authenticated";
grant TRUNCATE on public."creation_likes" to "authenticated";
grant UPDATE on public."creation_likes" to "authenticated";
grant DELETE on public."creation_likes" to "service_role";
grant INSERT on public."creation_likes" to "service_role";
grant REFERENCES on public."creation_likes" to "service_role";
grant SELECT on public."creation_likes" to "service_role";
grant TRIGGER on public."creation_likes" to "service_role";
grant TRUNCATE on public."creation_likes" to "service_role";
grant UPDATE on public."creation_likes" to "service_role";
grant DELETE on public."creation_saves" to "anon";
grant INSERT on public."creation_saves" to "anon";
grant REFERENCES on public."creation_saves" to "anon";
grant SELECT on public."creation_saves" to "anon";
grant TRIGGER on public."creation_saves" to "anon";
grant TRUNCATE on public."creation_saves" to "anon";
grant UPDATE on public."creation_saves" to "anon";
grant DELETE on public."creation_saves" to "authenticated";
grant INSERT on public."creation_saves" to "authenticated";
grant REFERENCES on public."creation_saves" to "authenticated";
grant SELECT on public."creation_saves" to "authenticated";
grant TRIGGER on public."creation_saves" to "authenticated";
grant TRUNCATE on public."creation_saves" to "authenticated";
grant UPDATE on public."creation_saves" to "authenticated";
grant DELETE on public."creation_saves" to "service_role";
grant INSERT on public."creation_saves" to "service_role";
grant REFERENCES on public."creation_saves" to "service_role";
grant SELECT on public."creation_saves" to "service_role";
grant TRIGGER on public."creation_saves" to "service_role";
grant TRUNCATE on public."creation_saves" to "service_role";
grant UPDATE on public."creation_saves" to "service_role";
grant DELETE on public."creation_views" to "anon";
grant INSERT on public."creation_views" to "anon";
grant REFERENCES on public."creation_views" to "anon";
grant SELECT on public."creation_views" to "anon";
grant TRIGGER on public."creation_views" to "anon";
grant TRUNCATE on public."creation_views" to "anon";
grant UPDATE on public."creation_views" to "anon";
grant DELETE on public."creation_views" to "authenticated";
grant INSERT on public."creation_views" to "authenticated";
grant REFERENCES on public."creation_views" to "authenticated";
grant SELECT on public."creation_views" to "authenticated";
grant TRIGGER on public."creation_views" to "authenticated";
grant TRUNCATE on public."creation_views" to "authenticated";
grant UPDATE on public."creation_views" to "authenticated";
grant DELETE on public."creation_views" to "service_role";
grant INSERT on public."creation_views" to "service_role";
grant REFERENCES on public."creation_views" to "service_role";
grant SELECT on public."creation_views" to "service_role";
grant TRIGGER on public."creation_views" to "service_role";
grant TRUNCATE on public."creation_views" to "service_role";
grant UPDATE on public."creation_views" to "service_role";
grant DELETE on public."creator_applications" to "anon";
grant INSERT on public."creator_applications" to "anon";
grant REFERENCES on public."creator_applications" to "anon";
grant SELECT on public."creator_applications" to "anon";
grant TRIGGER on public."creator_applications" to "anon";
grant TRUNCATE on public."creator_applications" to "anon";
grant UPDATE on public."creator_applications" to "anon";
grant DELETE on public."creator_applications" to "authenticated";
grant INSERT on public."creator_applications" to "authenticated";
grant REFERENCES on public."creator_applications" to "authenticated";
grant SELECT on public."creator_applications" to "authenticated";
grant TRIGGER on public."creator_applications" to "authenticated";
grant TRUNCATE on public."creator_applications" to "authenticated";
grant UPDATE on public."creator_applications" to "authenticated";
grant DELETE on public."creator_applications" to "service_role";
grant INSERT on public."creator_applications" to "service_role";
grant REFERENCES on public."creator_applications" to "service_role";
grant SELECT on public."creator_applications" to "service_role";
grant TRIGGER on public."creator_applications" to "service_role";
grant TRUNCATE on public."creator_applications" to "service_role";
grant UPDATE on public."creator_applications" to "service_role";
grant DELETE on public."creator_commissions" to "anon";
grant INSERT on public."creator_commissions" to "anon";
grant REFERENCES on public."creator_commissions" to "anon";
grant SELECT on public."creator_commissions" to "anon";
grant TRIGGER on public."creator_commissions" to "anon";
grant TRUNCATE on public."creator_commissions" to "anon";
grant UPDATE on public."creator_commissions" to "anon";
grant DELETE on public."creator_commissions" to "authenticated";
grant INSERT on public."creator_commissions" to "authenticated";
grant REFERENCES on public."creator_commissions" to "authenticated";
grant SELECT on public."creator_commissions" to "authenticated";
grant TRIGGER on public."creator_commissions" to "authenticated";
grant TRUNCATE on public."creator_commissions" to "authenticated";
grant UPDATE on public."creator_commissions" to "authenticated";
grant DELETE on public."creator_commissions" to "service_role";
grant INSERT on public."creator_commissions" to "service_role";
grant REFERENCES on public."creator_commissions" to "service_role";
grant SELECT on public."creator_commissions" to "service_role";
grant TRIGGER on public."creator_commissions" to "service_role";
grant TRUNCATE on public."creator_commissions" to "service_role";
grant UPDATE on public."creator_commissions" to "service_role";
grant DELETE on public."creator_follows" to "anon";
grant INSERT on public."creator_follows" to "anon";
grant REFERENCES on public."creator_follows" to "anon";
grant SELECT on public."creator_follows" to "anon";
grant TRIGGER on public."creator_follows" to "anon";
grant TRUNCATE on public."creator_follows" to "anon";
grant UPDATE on public."creator_follows" to "anon";
grant DELETE on public."creator_follows" to "authenticated";
grant INSERT on public."creator_follows" to "authenticated";
grant REFERENCES on public."creator_follows" to "authenticated";
grant SELECT on public."creator_follows" to "authenticated";
grant TRIGGER on public."creator_follows" to "authenticated";
grant TRUNCATE on public."creator_follows" to "authenticated";
grant UPDATE on public."creator_follows" to "authenticated";
grant DELETE on public."creator_follows" to "service_role";
grant INSERT on public."creator_follows" to "service_role";
grant REFERENCES on public."creator_follows" to "service_role";
grant SELECT on public."creator_follows" to "service_role";
grant TRIGGER on public."creator_follows" to "service_role";
grant TRUNCATE on public."creator_follows" to "service_role";
grant UPDATE on public."creator_follows" to "service_role";
grant DELETE on public."credit_orders" to "anon";
grant INSERT on public."credit_orders" to "anon";
grant REFERENCES on public."credit_orders" to "anon";
grant SELECT on public."credit_orders" to "anon";
grant TRIGGER on public."credit_orders" to "anon";
grant TRUNCATE on public."credit_orders" to "anon";
grant UPDATE on public."credit_orders" to "anon";
grant DELETE on public."credit_orders" to "authenticated";
grant INSERT on public."credit_orders" to "authenticated";
grant REFERENCES on public."credit_orders" to "authenticated";
grant SELECT on public."credit_orders" to "authenticated";
grant TRIGGER on public."credit_orders" to "authenticated";
grant TRUNCATE on public."credit_orders" to "authenticated";
grant UPDATE on public."credit_orders" to "authenticated";
grant DELETE on public."credit_orders" to "service_role";
grant INSERT on public."credit_orders" to "service_role";
grant REFERENCES on public."credit_orders" to "service_role";
grant SELECT on public."credit_orders" to "service_role";
grant TRIGGER on public."credit_orders" to "service_role";
grant TRUNCATE on public."credit_orders" to "service_role";
grant UPDATE on public."credit_orders" to "service_role";
grant DELETE on public."credit_transactions" to "anon";
grant INSERT on public."credit_transactions" to "anon";
grant REFERENCES on public."credit_transactions" to "anon";
grant SELECT on public."credit_transactions" to "anon";
grant TRIGGER on public."credit_transactions" to "anon";
grant TRUNCATE on public."credit_transactions" to "anon";
grant UPDATE on public."credit_transactions" to "anon";
grant DELETE on public."credit_transactions" to "authenticated";
grant INSERT on public."credit_transactions" to "authenticated";
grant REFERENCES on public."credit_transactions" to "authenticated";
grant SELECT on public."credit_transactions" to "authenticated";
grant TRIGGER on public."credit_transactions" to "authenticated";
grant TRUNCATE on public."credit_transactions" to "authenticated";
grant UPDATE on public."credit_transactions" to "authenticated";
grant DELETE on public."credit_transactions" to "service_role";
grant INSERT on public."credit_transactions" to "service_role";
grant REFERENCES on public."credit_transactions" to "service_role";
grant SELECT on public."credit_transactions" to "service_role";
grant TRIGGER on public."credit_transactions" to "service_role";
grant TRUNCATE on public."credit_transactions" to "service_role";
grant UPDATE on public."credit_transactions" to "service_role";
grant DELETE on public."data_retention_policies" to "anon";
grant INSERT on public."data_retention_policies" to "anon";
grant REFERENCES on public."data_retention_policies" to "anon";
grant SELECT on public."data_retention_policies" to "anon";
grant TRIGGER on public."data_retention_policies" to "anon";
grant TRUNCATE on public."data_retention_policies" to "anon";
grant UPDATE on public."data_retention_policies" to "anon";
grant DELETE on public."data_retention_policies" to "authenticated";
grant INSERT on public."data_retention_policies" to "authenticated";
grant REFERENCES on public."data_retention_policies" to "authenticated";
grant SELECT on public."data_retention_policies" to "authenticated";
grant TRIGGER on public."data_retention_policies" to "authenticated";
grant TRUNCATE on public."data_retention_policies" to "authenticated";
grant UPDATE on public."data_retention_policies" to "authenticated";
grant DELETE on public."data_retention_policies" to "service_role";
grant INSERT on public."data_retention_policies" to "service_role";
grant REFERENCES on public."data_retention_policies" to "service_role";
grant SELECT on public."data_retention_policies" to "service_role";
grant TRIGGER on public."data_retention_policies" to "service_role";
grant TRUNCATE on public."data_retention_policies" to "service_role";
grant UPDATE on public."data_retention_policies" to "service_role";
grant DELETE on public."email_logs" to "anon";
grant INSERT on public."email_logs" to "anon";
grant REFERENCES on public."email_logs" to "anon";
grant SELECT on public."email_logs" to "anon";
grant TRIGGER on public."email_logs" to "anon";
grant TRUNCATE on public."email_logs" to "anon";
grant UPDATE on public."email_logs" to "anon";
grant DELETE on public."email_logs" to "authenticated";
grant INSERT on public."email_logs" to "authenticated";
grant REFERENCES on public."email_logs" to "authenticated";
grant SELECT on public."email_logs" to "authenticated";
grant TRIGGER on public."email_logs" to "authenticated";
grant TRUNCATE on public."email_logs" to "authenticated";
grant UPDATE on public."email_logs" to "authenticated";
grant DELETE on public."email_logs" to "service_role";
grant INSERT on public."email_logs" to "service_role";
grant REFERENCES on public."email_logs" to "service_role";
grant SELECT on public."email_logs" to "service_role";
grant TRIGGER on public."email_logs" to "service_role";
grant TRUNCATE on public."email_logs" to "service_role";
grant UPDATE on public."email_logs" to "service_role";
grant DELETE on public."email_outbox" to "anon";
grant INSERT on public."email_outbox" to "anon";
grant REFERENCES on public."email_outbox" to "anon";
grant SELECT on public."email_outbox" to "anon";
grant TRIGGER on public."email_outbox" to "anon";
grant TRUNCATE on public."email_outbox" to "anon";
grant UPDATE on public."email_outbox" to "anon";
grant DELETE on public."email_outbox" to "authenticated";
grant INSERT on public."email_outbox" to "authenticated";
grant REFERENCES on public."email_outbox" to "authenticated";
grant SELECT on public."email_outbox" to "authenticated";
grant TRIGGER on public."email_outbox" to "authenticated";
grant TRUNCATE on public."email_outbox" to "authenticated";
grant UPDATE on public."email_outbox" to "authenticated";
grant DELETE on public."email_outbox" to "service_role";
grant INSERT on public."email_outbox" to "service_role";
grant REFERENCES on public."email_outbox" to "service_role";
grant SELECT on public."email_outbox" to "service_role";
grant TRIGGER on public."email_outbox" to "service_role";
grant TRUNCATE on public."email_outbox" to "service_role";
grant UPDATE on public."email_outbox" to "service_role";
grant DELETE on public."email_settings" to "anon";
grant INSERT on public."email_settings" to "anon";
grant REFERENCES on public."email_settings" to "anon";
grant SELECT on public."email_settings" to "anon";
grant TRIGGER on public."email_settings" to "anon";
grant TRUNCATE on public."email_settings" to "anon";
grant UPDATE on public."email_settings" to "anon";
grant DELETE on public."email_settings" to "authenticated";
grant INSERT on public."email_settings" to "authenticated";
grant REFERENCES on public."email_settings" to "authenticated";
grant SELECT on public."email_settings" to "authenticated";
grant TRIGGER on public."email_settings" to "authenticated";
grant TRUNCATE on public."email_settings" to "authenticated";
grant UPDATE on public."email_settings" to "authenticated";
grant DELETE on public."email_settings" to "service_role";
grant INSERT on public."email_settings" to "service_role";
grant REFERENCES on public."email_settings" to "service_role";
grant SELECT on public."email_settings" to "service_role";
grant TRIGGER on public."email_settings" to "service_role";
grant TRUNCATE on public."email_settings" to "service_role";
grant UPDATE on public."email_settings" to "service_role";
grant DELETE on public."email_template_versions" to "anon";
grant INSERT on public."email_template_versions" to "anon";
grant REFERENCES on public."email_template_versions" to "anon";
grant SELECT on public."email_template_versions" to "anon";
grant TRIGGER on public."email_template_versions" to "anon";
grant TRUNCATE on public."email_template_versions" to "anon";
grant UPDATE on public."email_template_versions" to "anon";
grant DELETE on public."email_template_versions" to "authenticated";
grant INSERT on public."email_template_versions" to "authenticated";
grant REFERENCES on public."email_template_versions" to "authenticated";
grant SELECT on public."email_template_versions" to "authenticated";
grant TRIGGER on public."email_template_versions" to "authenticated";
grant TRUNCATE on public."email_template_versions" to "authenticated";
grant UPDATE on public."email_template_versions" to "authenticated";
grant DELETE on public."email_template_versions" to "service_role";
grant INSERT on public."email_template_versions" to "service_role";
grant REFERENCES on public."email_template_versions" to "service_role";
grant SELECT on public."email_template_versions" to "service_role";
grant TRIGGER on public."email_template_versions" to "service_role";
grant TRUNCATE on public."email_template_versions" to "service_role";
grant UPDATE on public."email_template_versions" to "service_role";
grant DELETE on public."email_templates" to "anon";
grant INSERT on public."email_templates" to "anon";
grant REFERENCES on public."email_templates" to "anon";
grant SELECT on public."email_templates" to "anon";
grant TRIGGER on public."email_templates" to "anon";
grant TRUNCATE on public."email_templates" to "anon";
grant UPDATE on public."email_templates" to "anon";
grant DELETE on public."email_templates" to "authenticated";
grant INSERT on public."email_templates" to "authenticated";
grant REFERENCES on public."email_templates" to "authenticated";
grant SELECT on public."email_templates" to "authenticated";
grant TRIGGER on public."email_templates" to "authenticated";
grant TRUNCATE on public."email_templates" to "authenticated";
grant UPDATE on public."email_templates" to "authenticated";
grant DELETE on public."email_templates" to "service_role";
grant INSERT on public."email_templates" to "service_role";
grant REFERENCES on public."email_templates" to "service_role";
grant SELECT on public."email_templates" to "service_role";
grant TRIGGER on public."email_templates" to "service_role";
grant TRUNCATE on public."email_templates" to "service_role";
grant UPDATE on public."email_templates" to "service_role";
grant DELETE on public."engine_internal_canary_users" to "service_role";
grant INSERT on public."engine_internal_canary_users" to "service_role";
grant REFERENCES on public."engine_internal_canary_users" to "service_role";
grant SELECT on public."engine_internal_canary_users" to "service_role";
grant TRIGGER on public."engine_internal_canary_users" to "service_role";
grant TRUNCATE on public."engine_internal_canary_users" to "service_role";
grant UPDATE on public."engine_internal_canary_users" to "service_role";
grant DELETE on public."engine_shadow_comparisons" to "anon";
grant INSERT on public."engine_shadow_comparisons" to "anon";
grant REFERENCES on public."engine_shadow_comparisons" to "anon";
grant SELECT on public."engine_shadow_comparisons" to "anon";
grant TRIGGER on public."engine_shadow_comparisons" to "anon";
grant TRUNCATE on public."engine_shadow_comparisons" to "anon";
grant UPDATE on public."engine_shadow_comparisons" to "anon";
grant DELETE on public."engine_shadow_comparisons" to "authenticated";
grant INSERT on public."engine_shadow_comparisons" to "authenticated";
grant REFERENCES on public."engine_shadow_comparisons" to "authenticated";
grant SELECT on public."engine_shadow_comparisons" to "authenticated";
grant TRIGGER on public."engine_shadow_comparisons" to "authenticated";
grant TRUNCATE on public."engine_shadow_comparisons" to "authenticated";
grant UPDATE on public."engine_shadow_comparisons" to "authenticated";
grant DELETE on public."engine_shadow_comparisons" to "service_role";
grant INSERT on public."engine_shadow_comparisons" to "service_role";
grant REFERENCES on public."engine_shadow_comparisons" to "service_role";
grant SELECT on public."engine_shadow_comparisons" to "service_role";
grant TRIGGER on public."engine_shadow_comparisons" to "service_role";
grant TRUNCATE on public."engine_shadow_comparisons" to "service_role";
grant UPDATE on public."engine_shadow_comparisons" to "service_role";
grant DELETE on public."feature_flags" to "anon";
grant INSERT on public."feature_flags" to "anon";
grant REFERENCES on public."feature_flags" to "anon";
grant SELECT on public."feature_flags" to "anon";
grant TRIGGER on public."feature_flags" to "anon";
grant TRUNCATE on public."feature_flags" to "anon";
grant UPDATE on public."feature_flags" to "anon";
grant DELETE on public."feature_flags" to "authenticated";
grant INSERT on public."feature_flags" to "authenticated";
grant REFERENCES on public."feature_flags" to "authenticated";
grant SELECT on public."feature_flags" to "authenticated";
grant TRIGGER on public."feature_flags" to "authenticated";
grant TRUNCATE on public."feature_flags" to "authenticated";
grant UPDATE on public."feature_flags" to "authenticated";
grant DELETE on public."feature_flags" to "service_role";
grant INSERT on public."feature_flags" to "service_role";
grant REFERENCES on public."feature_flags" to "service_role";
grant SELECT on public."feature_flags" to "service_role";
grant TRIGGER on public."feature_flags" to "service_role";
grant TRUNCATE on public."feature_flags" to "service_role";
grant UPDATE on public."feature_flags" to "service_role";
grant DELETE on public."generation_internal_prompts" to "service_role";
grant INSERT on public."generation_internal_prompts" to "service_role";
grant REFERENCES on public."generation_internal_prompts" to "service_role";
grant SELECT on public."generation_internal_prompts" to "service_role";
grant TRIGGER on public."generation_internal_prompts" to "service_role";
grant TRUNCATE on public."generation_internal_prompts" to "service_role";
grant UPDATE on public."generation_internal_prompts" to "service_role";
grant DELETE on public."generation_jobs" to "anon";
grant INSERT on public."generation_jobs" to "anon";
grant REFERENCES on public."generation_jobs" to "anon";
grant SELECT on public."generation_jobs" to "anon";
grant TRIGGER on public."generation_jobs" to "anon";
grant TRUNCATE on public."generation_jobs" to "anon";
grant UPDATE on public."generation_jobs" to "anon";
grant DELETE on public."generation_jobs" to "authenticated";
grant INSERT on public."generation_jobs" to "authenticated";
grant REFERENCES on public."generation_jobs" to "authenticated";
grant SELECT on public."generation_jobs" to "authenticated";
grant TRIGGER on public."generation_jobs" to "authenticated";
grant TRUNCATE on public."generation_jobs" to "authenticated";
grant UPDATE on public."generation_jobs" to "authenticated";
grant DELETE on public."generation_jobs" to "service_role";
grant INSERT on public."generation_jobs" to "service_role";
grant REFERENCES on public."generation_jobs" to "service_role";
grant SELECT on public."generation_jobs" to "service_role";
grant TRIGGER on public."generation_jobs" to "service_role";
grant TRUNCATE on public."generation_jobs" to "service_role";
grant UPDATE on public."generation_jobs" to "service_role";
grant DELETE on public."generations" to "anon";
grant INSERT on public."generations" to "anon";
grant REFERENCES on public."generations" to "anon";
grant SELECT on public."generations" to "anon";
grant TRIGGER on public."generations" to "anon";
grant TRUNCATE on public."generations" to "anon";
grant UPDATE on public."generations" to "anon";
grant DELETE on public."generations" to "authenticated";
grant INSERT on public."generations" to "authenticated";
grant REFERENCES on public."generations" to "authenticated";
grant SELECT on public."generations" to "authenticated";
grant TRIGGER on public."generations" to "authenticated";
grant TRUNCATE on public."generations" to "authenticated";
grant UPDATE on public."generations" to "authenticated";
grant DELETE on public."generations" to "service_role";
grant INSERT on public."generations" to "service_role";
grant REFERENCES on public."generations" to "service_role";
grant SELECT on public."generations" to "service_role";
grant TRIGGER on public."generations" to "service_role";
grant TRUNCATE on public."generations" to "service_role";
grant UPDATE on public."generations" to "service_role";
grant DELETE on public."help_articles" to "anon";
grant INSERT on public."help_articles" to "anon";
grant REFERENCES on public."help_articles" to "anon";
grant SELECT on public."help_articles" to "anon";
grant TRIGGER on public."help_articles" to "anon";
grant TRUNCATE on public."help_articles" to "anon";
grant UPDATE on public."help_articles" to "anon";
grant DELETE on public."help_articles" to "authenticated";
grant INSERT on public."help_articles" to "authenticated";
grant REFERENCES on public."help_articles" to "authenticated";
grant SELECT on public."help_articles" to "authenticated";
grant TRIGGER on public."help_articles" to "authenticated";
grant TRUNCATE on public."help_articles" to "authenticated";
grant UPDATE on public."help_articles" to "authenticated";
grant DELETE on public."help_articles" to "service_role";
grant INSERT on public."help_articles" to "service_role";
grant REFERENCES on public."help_articles" to "service_role";
grant SELECT on public."help_articles" to "service_role";
grant TRIGGER on public."help_articles" to "service_role";
grant TRUNCATE on public."help_articles" to "service_role";
grant UPDATE on public."help_articles" to "service_role";
grant DELETE on public."launch_waitlist" to "service_role";
grant INSERT on public."launch_waitlist" to "service_role";
grant REFERENCES on public."launch_waitlist" to "service_role";
grant SELECT on public."launch_waitlist" to "service_role";
grant TRIGGER on public."launch_waitlist" to "service_role";
grant TRUNCATE on public."launch_waitlist" to "service_role";
grant UPDATE on public."launch_waitlist" to "service_role";
grant DELETE on public."login_ads" to "service_role";
grant INSERT on public."login_ads" to "service_role";
grant REFERENCES on public."login_ads" to "service_role";
grant SELECT on public."login_ads" to "service_role";
grant TRIGGER on public."login_ads" to "service_role";
grant TRUNCATE on public."login_ads" to "service_role";
grant UPDATE on public."login_ads" to "service_role";
grant DELETE on public."maro_prompts" to "anon";
grant INSERT on public."maro_prompts" to "anon";
grant REFERENCES on public."maro_prompts" to "anon";
grant SELECT on public."maro_prompts" to "anon";
grant TRIGGER on public."maro_prompts" to "anon";
grant TRUNCATE on public."maro_prompts" to "anon";
grant UPDATE on public."maro_prompts" to "anon";
grant DELETE on public."maro_prompts" to "authenticated";
grant INSERT on public."maro_prompts" to "authenticated";
grant REFERENCES on public."maro_prompts" to "authenticated";
grant SELECT on public."maro_prompts" to "authenticated";
grant TRIGGER on public."maro_prompts" to "authenticated";
grant TRUNCATE on public."maro_prompts" to "authenticated";
grant UPDATE on public."maro_prompts" to "authenticated";
grant DELETE on public."maro_prompts" to "service_role";
grant INSERT on public."maro_prompts" to "service_role";
grant REFERENCES on public."maro_prompts" to "service_role";
grant SELECT on public."maro_prompts" to "service_role";
grant TRIGGER on public."maro_prompts" to "service_role";
grant TRUNCATE on public."maro_prompts" to "service_role";
grant UPDATE on public."maro_prompts" to "service_role";
grant DELETE on public."memberships" to "anon";
grant INSERT on public."memberships" to "anon";
grant REFERENCES on public."memberships" to "anon";
grant SELECT on public."memberships" to "anon";
grant TRIGGER on public."memberships" to "anon";
grant TRUNCATE on public."memberships" to "anon";
grant UPDATE on public."memberships" to "anon";
grant DELETE on public."memberships" to "authenticated";
grant INSERT on public."memberships" to "authenticated";
grant REFERENCES on public."memberships" to "authenticated";
grant SELECT on public."memberships" to "authenticated";
grant TRIGGER on public."memberships" to "authenticated";
grant TRUNCATE on public."memberships" to "authenticated";
grant UPDATE on public."memberships" to "authenticated";
grant DELETE on public."memberships" to "service_role";
grant INSERT on public."memberships" to "service_role";
grant REFERENCES on public."memberships" to "service_role";
grant SELECT on public."memberships" to "service_role";
grant TRIGGER on public."memberships" to "service_role";
grant TRUNCATE on public."memberships" to "service_role";
grant UPDATE on public."memberships" to "service_role";
grant DELETE on public."notification_campaigns" to "anon";
grant INSERT on public."notification_campaigns" to "anon";
grant REFERENCES on public."notification_campaigns" to "anon";
grant SELECT on public."notification_campaigns" to "anon";
grant TRIGGER on public."notification_campaigns" to "anon";
grant TRUNCATE on public."notification_campaigns" to "anon";
grant UPDATE on public."notification_campaigns" to "anon";
grant DELETE on public."notification_campaigns" to "authenticated";
grant INSERT on public."notification_campaigns" to "authenticated";
grant REFERENCES on public."notification_campaigns" to "authenticated";
grant SELECT on public."notification_campaigns" to "authenticated";
grant TRIGGER on public."notification_campaigns" to "authenticated";
grant TRUNCATE on public."notification_campaigns" to "authenticated";
grant UPDATE on public."notification_campaigns" to "authenticated";
grant DELETE on public."notification_campaigns" to "service_role";
grant INSERT on public."notification_campaigns" to "service_role";
grant REFERENCES on public."notification_campaigns" to "service_role";
grant SELECT on public."notification_campaigns" to "service_role";
grant TRIGGER on public."notification_campaigns" to "service_role";
grant TRUNCATE on public."notification_campaigns" to "service_role";
grant UPDATE on public."notification_campaigns" to "service_role";
grant DELETE on public."notification_dismissals" to "anon";
grant INSERT on public."notification_dismissals" to "anon";
grant REFERENCES on public."notification_dismissals" to "anon";
grant SELECT on public."notification_dismissals" to "anon";
grant TRIGGER on public."notification_dismissals" to "anon";
grant TRUNCATE on public."notification_dismissals" to "anon";
grant UPDATE on public."notification_dismissals" to "anon";
grant DELETE on public."notification_dismissals" to "authenticated";
grant INSERT on public."notification_dismissals" to "authenticated";
grant REFERENCES on public."notification_dismissals" to "authenticated";
grant SELECT on public."notification_dismissals" to "authenticated";
grant TRIGGER on public."notification_dismissals" to "authenticated";
grant TRUNCATE on public."notification_dismissals" to "authenticated";
grant UPDATE on public."notification_dismissals" to "authenticated";
grant DELETE on public."notification_dismissals" to "service_role";
grant INSERT on public."notification_dismissals" to "service_role";
grant REFERENCES on public."notification_dismissals" to "service_role";
grant SELECT on public."notification_dismissals" to "service_role";
grant TRIGGER on public."notification_dismissals" to "service_role";
grant TRUNCATE on public."notification_dismissals" to "service_role";
grant UPDATE on public."notification_dismissals" to "service_role";
grant DELETE on public."paddle_webhook_events" to "service_role";
grant INSERT on public."paddle_webhook_events" to "service_role";
grant REFERENCES on public."paddle_webhook_events" to "service_role";
grant SELECT on public."paddle_webhook_events" to "service_role";
grant TRIGGER on public."paddle_webhook_events" to "service_role";
grant TRUNCATE on public."paddle_webhook_events" to "service_role";
grant UPDATE on public."paddle_webhook_events" to "service_role";
grant DELETE on public."platform_spend_rollup" to "anon";
grant INSERT on public."platform_spend_rollup" to "anon";
grant REFERENCES on public."platform_spend_rollup" to "anon";
grant SELECT on public."platform_spend_rollup" to "anon";
grant TRIGGER on public."platform_spend_rollup" to "anon";
grant TRUNCATE on public."platform_spend_rollup" to "anon";
grant UPDATE on public."platform_spend_rollup" to "anon";
grant DELETE on public."platform_spend_rollup" to "authenticated";
grant INSERT on public."platform_spend_rollup" to "authenticated";
grant REFERENCES on public."platform_spend_rollup" to "authenticated";
grant SELECT on public."platform_spend_rollup" to "authenticated";
grant TRIGGER on public."platform_spend_rollup" to "authenticated";
grant TRUNCATE on public."platform_spend_rollup" to "authenticated";
grant UPDATE on public."platform_spend_rollup" to "authenticated";
grant DELETE on public."platform_spend_rollup" to "service_role";
grant INSERT on public."platform_spend_rollup" to "service_role";
grant REFERENCES on public."platform_spend_rollup" to "service_role";
grant SELECT on public."platform_spend_rollup" to "service_role";
grant TRIGGER on public."platform_spend_rollup" to "service_role";
grant TRUNCATE on public."platform_spend_rollup" to "service_role";
grant UPDATE on public."platform_spend_rollup" to "service_role";
grant DELETE on public."preset_categories" to "anon";
grant INSERT on public."preset_categories" to "anon";
grant REFERENCES on public."preset_categories" to "anon";
grant SELECT on public."preset_categories" to "anon";
grant TRIGGER on public."preset_categories" to "anon";
grant TRUNCATE on public."preset_categories" to "anon";
grant UPDATE on public."preset_categories" to "anon";
grant DELETE on public."preset_categories" to "authenticated";
grant INSERT on public."preset_categories" to "authenticated";
grant REFERENCES on public."preset_categories" to "authenticated";
grant SELECT on public."preset_categories" to "authenticated";
grant TRIGGER on public."preset_categories" to "authenticated";
grant TRUNCATE on public."preset_categories" to "authenticated";
grant UPDATE on public."preset_categories" to "authenticated";
grant DELETE on public."preset_categories" to "service_role";
grant INSERT on public."preset_categories" to "service_role";
grant REFERENCES on public."preset_categories" to "service_role";
grant SELECT on public."preset_categories" to "service_role";
grant TRIGGER on public."preset_categories" to "service_role";
grant TRUNCATE on public."preset_categories" to "service_role";
grant UPDATE on public."preset_categories" to "service_role";
grant DELETE on public."pricing_snapshots" to "anon";
grant INSERT on public."pricing_snapshots" to "anon";
grant REFERENCES on public."pricing_snapshots" to "anon";
grant SELECT on public."pricing_snapshots" to "anon";
grant TRIGGER on public."pricing_snapshots" to "anon";
grant TRUNCATE on public."pricing_snapshots" to "anon";
grant UPDATE on public."pricing_snapshots" to "anon";
grant DELETE on public."pricing_snapshots" to "authenticated";
grant INSERT on public."pricing_snapshots" to "authenticated";
grant REFERENCES on public."pricing_snapshots" to "authenticated";
grant SELECT on public."pricing_snapshots" to "authenticated";
grant TRIGGER on public."pricing_snapshots" to "authenticated";
grant TRUNCATE on public."pricing_snapshots" to "authenticated";
grant UPDATE on public."pricing_snapshots" to "authenticated";
grant DELETE on public."pricing_snapshots" to "service_role";
grant INSERT on public."pricing_snapshots" to "service_role";
grant REFERENCES on public."pricing_snapshots" to "service_role";
grant SELECT on public."pricing_snapshots" to "service_role";
grant TRIGGER on public."pricing_snapshots" to "service_role";
grant TRUNCATE on public."pricing_snapshots" to "service_role";
grant UPDATE on public."pricing_snapshots" to "service_role";
grant DELETE on public."product_events" to "anon";
grant INSERT on public."product_events" to "anon";
grant REFERENCES on public."product_events" to "anon";
grant SELECT on public."product_events" to "anon";
grant TRIGGER on public."product_events" to "anon";
grant TRUNCATE on public."product_events" to "anon";
grant UPDATE on public."product_events" to "anon";
grant DELETE on public."product_events" to "authenticated";
grant INSERT on public."product_events" to "authenticated";
grant REFERENCES on public."product_events" to "authenticated";
grant SELECT on public."product_events" to "authenticated";
grant TRIGGER on public."product_events" to "authenticated";
grant TRUNCATE on public."product_events" to "authenticated";
grant UPDATE on public."product_events" to "authenticated";
grant DELETE on public."product_events" to "service_role";
grant INSERT on public."product_events" to "service_role";
grant REFERENCES on public."product_events" to "service_role";
grant SELECT on public."product_events" to "service_role";
grant TRIGGER on public."product_events" to "service_role";
grant TRUNCATE on public."product_events" to "service_role";
grant UPDATE on public."product_events" to "service_role";
grant DELETE on public."profiles" to "anon";
grant INSERT on public."profiles" to "anon";
grant REFERENCES on public."profiles" to "anon";
grant SELECT on public."profiles" to "anon";
grant TRIGGER on public."profiles" to "anon";
grant TRUNCATE on public."profiles" to "anon";
grant UPDATE on public."profiles" to "anon";
grant DELETE on public."profiles" to "authenticated";
grant INSERT on public."profiles" to "authenticated";
grant REFERENCES on public."profiles" to "authenticated";
grant SELECT on public."profiles" to "authenticated";
grant TRIGGER on public."profiles" to "authenticated";
grant TRUNCATE on public."profiles" to "authenticated";
grant UPDATE on public."profiles" to "authenticated";
grant DELETE on public."profiles" to "service_role";
grant INSERT on public."profiles" to "service_role";
grant REFERENCES on public."profiles" to "service_role";
grant SELECT on public."profiles" to "service_role";
grant TRIGGER on public."profiles" to "service_role";
grant TRUNCATE on public."profiles" to "service_role";
grant UPDATE on public."profiles" to "service_role";
grant DELETE on public."promo_codes" to "anon";
grant INSERT on public."promo_codes" to "anon";
grant REFERENCES on public."promo_codes" to "anon";
grant SELECT on public."promo_codes" to "anon";
grant TRIGGER on public."promo_codes" to "anon";
grant TRUNCATE on public."promo_codes" to "anon";
grant UPDATE on public."promo_codes" to "anon";
grant DELETE on public."promo_codes" to "authenticated";
grant INSERT on public."promo_codes" to "authenticated";
grant REFERENCES on public."promo_codes" to "authenticated";
grant SELECT on public."promo_codes" to "authenticated";
grant TRIGGER on public."promo_codes" to "authenticated";
grant TRUNCATE on public."promo_codes" to "authenticated";
grant UPDATE on public."promo_codes" to "authenticated";
grant DELETE on public."promo_codes" to "service_role";
grant INSERT on public."promo_codes" to "service_role";
grant REFERENCES on public."promo_codes" to "service_role";
grant SELECT on public."promo_codes" to "service_role";
grant TRIGGER on public."promo_codes" to "service_role";
grant TRUNCATE on public."promo_codes" to "service_role";
grant UPDATE on public."promo_codes" to "service_role";
grant DELETE on public."promo_events" to "anon";
grant INSERT on public."promo_events" to "anon";
grant REFERENCES on public."promo_events" to "anon";
grant SELECT on public."promo_events" to "anon";
grant TRIGGER on public."promo_events" to "anon";
grant TRUNCATE on public."promo_events" to "anon";
grant UPDATE on public."promo_events" to "anon";
grant DELETE on public."promo_events" to "authenticated";
grant INSERT on public."promo_events" to "authenticated";
grant REFERENCES on public."promo_events" to "authenticated";
grant SELECT on public."promo_events" to "authenticated";
grant TRIGGER on public."promo_events" to "authenticated";
grant TRUNCATE on public."promo_events" to "authenticated";
grant UPDATE on public."promo_events" to "authenticated";
grant DELETE on public."promo_events" to "service_role";
grant INSERT on public."promo_events" to "service_role";
grant REFERENCES on public."promo_events" to "service_role";
grant SELECT on public."promo_events" to "service_role";
grant TRIGGER on public."promo_events" to "service_role";
grant TRUNCATE on public."promo_events" to "service_role";
grant UPDATE on public."promo_events" to "service_role";
grant DELETE on public."prompt_events" to "anon";
grant INSERT on public."prompt_events" to "anon";
grant REFERENCES on public."prompt_events" to "anon";
grant SELECT on public."prompt_events" to "anon";
grant TRIGGER on public."prompt_events" to "anon";
grant TRUNCATE on public."prompt_events" to "anon";
grant UPDATE on public."prompt_events" to "anon";
grant DELETE on public."prompt_events" to "authenticated";
grant INSERT on public."prompt_events" to "authenticated";
grant REFERENCES on public."prompt_events" to "authenticated";
grant SELECT on public."prompt_events" to "authenticated";
grant TRIGGER on public."prompt_events" to "authenticated";
grant TRUNCATE on public."prompt_events" to "authenticated";
grant UPDATE on public."prompt_events" to "authenticated";
grant DELETE on public."prompt_events" to "service_role";
grant INSERT on public."prompt_events" to "service_role";
grant REFERENCES on public."prompt_events" to "service_role";
grant SELECT on public."prompt_events" to "service_role";
grant TRIGGER on public."prompt_events" to "service_role";
grant TRUNCATE on public."prompt_events" to "service_role";
grant UPDATE on public."prompt_events" to "service_role";
grant DELETE on public."prompt_layers" to "anon";
grant INSERT on public."prompt_layers" to "anon";
grant REFERENCES on public."prompt_layers" to "anon";
grant SELECT on public."prompt_layers" to "anon";
grant TRIGGER on public."prompt_layers" to "anon";
grant TRUNCATE on public."prompt_layers" to "anon";
grant UPDATE on public."prompt_layers" to "anon";
grant DELETE on public."prompt_layers" to "authenticated";
grant INSERT on public."prompt_layers" to "authenticated";
grant REFERENCES on public."prompt_layers" to "authenticated";
grant SELECT on public."prompt_layers" to "authenticated";
grant TRIGGER on public."prompt_layers" to "authenticated";
grant TRUNCATE on public."prompt_layers" to "authenticated";
grant UPDATE on public."prompt_layers" to "authenticated";
grant DELETE on public."prompt_layers" to "service_role";
grant INSERT on public."prompt_layers" to "service_role";
grant REFERENCES on public."prompt_layers" to "service_role";
grant SELECT on public."prompt_layers" to "service_role";
grant TRIGGER on public."prompt_layers" to "service_role";
grant TRUNCATE on public."prompt_layers" to "service_role";
grant UPDATE on public."prompt_layers" to "service_role";
grant DELETE on public."prompt_likes" to "anon";
grant INSERT on public."prompt_likes" to "anon";
grant REFERENCES on public."prompt_likes" to "anon";
grant SELECT on public."prompt_likes" to "anon";
grant TRIGGER on public."prompt_likes" to "anon";
grant TRUNCATE on public."prompt_likes" to "anon";
grant UPDATE on public."prompt_likes" to "anon";
grant DELETE on public."prompt_likes" to "authenticated";
grant INSERT on public."prompt_likes" to "authenticated";
grant REFERENCES on public."prompt_likes" to "authenticated";
grant SELECT on public."prompt_likes" to "authenticated";
grant TRIGGER on public."prompt_likes" to "authenticated";
grant TRUNCATE on public."prompt_likes" to "authenticated";
grant UPDATE on public."prompt_likes" to "authenticated";
grant DELETE on public."prompt_likes" to "service_role";
grant INSERT on public."prompt_likes" to "service_role";
grant REFERENCES on public."prompt_likes" to "service_role";
grant SELECT on public."prompt_likes" to "service_role";
grant TRIGGER on public."prompt_likes" to "service_role";
grant TRUNCATE on public."prompt_likes" to "service_role";
grant UPDATE on public."prompt_likes" to "service_role";
grant DELETE on public."prompt_reveals" to "anon";
grant INSERT on public."prompt_reveals" to "anon";
grant REFERENCES on public."prompt_reveals" to "anon";
grant SELECT on public."prompt_reveals" to "anon";
grant TRIGGER on public."prompt_reveals" to "anon";
grant TRUNCATE on public."prompt_reveals" to "anon";
grant UPDATE on public."prompt_reveals" to "anon";
grant DELETE on public."prompt_reveals" to "authenticated";
grant INSERT on public."prompt_reveals" to "authenticated";
grant REFERENCES on public."prompt_reveals" to "authenticated";
grant SELECT on public."prompt_reveals" to "authenticated";
grant TRIGGER on public."prompt_reveals" to "authenticated";
grant TRUNCATE on public."prompt_reveals" to "authenticated";
grant UPDATE on public."prompt_reveals" to "authenticated";
grant DELETE on public."prompt_reveals" to "service_role";
grant INSERT on public."prompt_reveals" to "service_role";
grant REFERENCES on public."prompt_reveals" to "service_role";
grant SELECT on public."prompt_reveals" to "service_role";
grant TRIGGER on public."prompt_reveals" to "service_role";
grant TRUNCATE on public."prompt_reveals" to "service_role";
grant UPDATE on public."prompt_reveals" to "service_role";
grant DELETE on public."provider_cost_estimates" to "anon";
grant INSERT on public."provider_cost_estimates" to "anon";
grant REFERENCES on public."provider_cost_estimates" to "anon";
grant SELECT on public."provider_cost_estimates" to "anon";
grant TRIGGER on public."provider_cost_estimates" to "anon";
grant TRUNCATE on public."provider_cost_estimates" to "anon";
grant UPDATE on public."provider_cost_estimates" to "anon";
grant DELETE on public."provider_cost_estimates" to "authenticated";
grant INSERT on public."provider_cost_estimates" to "authenticated";
grant REFERENCES on public."provider_cost_estimates" to "authenticated";
grant SELECT on public."provider_cost_estimates" to "authenticated";
grant TRIGGER on public."provider_cost_estimates" to "authenticated";
grant TRUNCATE on public."provider_cost_estimates" to "authenticated";
grant UPDATE on public."provider_cost_estimates" to "authenticated";
grant DELETE on public."provider_cost_estimates" to "service_role";
grant INSERT on public."provider_cost_estimates" to "service_role";
grant REFERENCES on public."provider_cost_estimates" to "service_role";
grant SELECT on public."provider_cost_estimates" to "service_role";
grant TRIGGER on public."provider_cost_estimates" to "service_role";
grant TRUNCATE on public."provider_cost_estimates" to "service_role";
grant UPDATE on public."provider_cost_estimates" to "service_role";
grant DELETE on public."public_creations" to "anon";
grant INSERT on public."public_creations" to "anon";
grant REFERENCES on public."public_creations" to "anon";
grant TRIGGER on public."public_creations" to "anon";
grant TRUNCATE on public."public_creations" to "anon";
grant UPDATE on public."public_creations" to "anon";
grant DELETE on public."public_creations" to "authenticated";
grant INSERT on public."public_creations" to "authenticated";
grant REFERENCES on public."public_creations" to "authenticated";
grant TRIGGER on public."public_creations" to "authenticated";
grant TRUNCATE on public."public_creations" to "authenticated";
grant UPDATE on public."public_creations" to "authenticated";
grant DELETE on public."public_creations" to "service_role";
grant INSERT on public."public_creations" to "service_role";
grant REFERENCES on public."public_creations" to "service_role";
grant SELECT on public."public_creations" to "service_role";
grant TRIGGER on public."public_creations" to "service_role";
grant TRUNCATE on public."public_creations" to "service_role";
grant UPDATE on public."public_creations" to "service_role";
grant DELETE on public."raiaccept_checkouts" to "service_role";
grant INSERT on public."raiaccept_checkouts" to "service_role";
grant REFERENCES on public."raiaccept_checkouts" to "service_role";
grant SELECT on public."raiaccept_checkouts" to "service_role";
grant TRIGGER on public."raiaccept_checkouts" to "service_role";
grant TRUNCATE on public."raiaccept_checkouts" to "service_role";
grant UPDATE on public."raiaccept_checkouts" to "service_role";
grant DELETE on public."raiaccept_receipt_jobs" to "service_role";
grant INSERT on public."raiaccept_receipt_jobs" to "service_role";
grant REFERENCES on public."raiaccept_receipt_jobs" to "service_role";
grant SELECT on public."raiaccept_receipt_jobs" to "service_role";
grant TRIGGER on public."raiaccept_receipt_jobs" to "service_role";
grant TRUNCATE on public."raiaccept_receipt_jobs" to "service_role";
grant UPDATE on public."raiaccept_receipt_jobs" to "service_role";
grant DELETE on public."raiaccept_verification_queue" to "service_role";
grant INSERT on public."raiaccept_verification_queue" to "service_role";
grant REFERENCES on public."raiaccept_verification_queue" to "service_role";
grant SELECT on public."raiaccept_verification_queue" to "service_role";
grant TRIGGER on public."raiaccept_verification_queue" to "service_role";
grant TRUNCATE on public."raiaccept_verification_queue" to "service_role";
grant UPDATE on public."raiaccept_verification_queue" to "service_role";
grant DELETE on public."raiaccept_verified_payments" to "service_role";
grant INSERT on public."raiaccept_verified_payments" to "service_role";
grant REFERENCES on public."raiaccept_verified_payments" to "service_role";
grant SELECT on public."raiaccept_verified_payments" to "service_role";
grant TRIGGER on public."raiaccept_verified_payments" to "service_role";
grant TRUNCATE on public."raiaccept_verified_payments" to "service_role";
grant UPDATE on public."raiaccept_verified_payments" to "service_role";
grant DELETE on public."rate_limit_events" to "anon";
grant INSERT on public."rate_limit_events" to "anon";
grant REFERENCES on public."rate_limit_events" to "anon";
grant SELECT on public."rate_limit_events" to "anon";
grant TRIGGER on public."rate_limit_events" to "anon";
grant TRUNCATE on public."rate_limit_events" to "anon";
grant UPDATE on public."rate_limit_events" to "anon";
grant DELETE on public."rate_limit_events" to "authenticated";
grant INSERT on public."rate_limit_events" to "authenticated";
grant REFERENCES on public."rate_limit_events" to "authenticated";
grant SELECT on public."rate_limit_events" to "authenticated";
grant TRIGGER on public."rate_limit_events" to "authenticated";
grant TRUNCATE on public."rate_limit_events" to "authenticated";
grant UPDATE on public."rate_limit_events" to "authenticated";
grant DELETE on public."rate_limit_events" to "service_role";
grant INSERT on public."rate_limit_events" to "service_role";
grant REFERENCES on public."rate_limit_events" to "service_role";
grant SELECT on public."rate_limit_events" to "service_role";
grant TRIGGER on public."rate_limit_events" to "service_role";
grant TRUNCATE on public."rate_limit_events" to "service_role";
grant UPDATE on public."rate_limit_events" to "service_role";
grant DELETE on public."refund_records" to "anon";
grant INSERT on public."refund_records" to "anon";
grant REFERENCES on public."refund_records" to "anon";
grant SELECT on public."refund_records" to "anon";
grant TRIGGER on public."refund_records" to "anon";
grant TRUNCATE on public."refund_records" to "anon";
grant UPDATE on public."refund_records" to "anon";
grant DELETE on public."refund_records" to "authenticated";
grant INSERT on public."refund_records" to "authenticated";
grant REFERENCES on public."refund_records" to "authenticated";
grant SELECT on public."refund_records" to "authenticated";
grant TRIGGER on public."refund_records" to "authenticated";
grant TRUNCATE on public."refund_records" to "authenticated";
grant UPDATE on public."refund_records" to "authenticated";
grant DELETE on public."refund_records" to "service_role";
grant INSERT on public."refund_records" to "service_role";
grant REFERENCES on public."refund_records" to "service_role";
grant SELECT on public."refund_records" to "service_role";
grant TRIGGER on public."refund_records" to "service_role";
grant TRUNCATE on public."refund_records" to "service_role";
grant UPDATE on public."refund_records" to "service_role";
grant DELETE on public."reports" to "anon";
grant INSERT on public."reports" to "anon";
grant REFERENCES on public."reports" to "anon";
grant SELECT on public."reports" to "anon";
grant TRIGGER on public."reports" to "anon";
grant TRUNCATE on public."reports" to "anon";
grant UPDATE on public."reports" to "anon";
grant DELETE on public."reports" to "authenticated";
grant INSERT on public."reports" to "authenticated";
grant REFERENCES on public."reports" to "authenticated";
grant SELECT on public."reports" to "authenticated";
grant TRIGGER on public."reports" to "authenticated";
grant TRUNCATE on public."reports" to "authenticated";
grant UPDATE on public."reports" to "authenticated";
grant DELETE on public."reports" to "service_role";
grant INSERT on public."reports" to "service_role";
grant REFERENCES on public."reports" to "service_role";
grant SELECT on public."reports" to "service_role";
grant TRIGGER on public."reports" to "service_role";
grant TRUNCATE on public."reports" to "service_role";
grant UPDATE on public."reports" to "service_role";
grant DELETE on public."retention_execution_runs" to "anon";
grant INSERT on public."retention_execution_runs" to "anon";
grant REFERENCES on public."retention_execution_runs" to "anon";
grant SELECT on public."retention_execution_runs" to "anon";
grant TRIGGER on public."retention_execution_runs" to "anon";
grant TRUNCATE on public."retention_execution_runs" to "anon";
grant UPDATE on public."retention_execution_runs" to "anon";
grant DELETE on public."retention_execution_runs" to "authenticated";
grant INSERT on public."retention_execution_runs" to "authenticated";
grant REFERENCES on public."retention_execution_runs" to "authenticated";
grant SELECT on public."retention_execution_runs" to "authenticated";
grant TRIGGER on public."retention_execution_runs" to "authenticated";
grant TRUNCATE on public."retention_execution_runs" to "authenticated";
grant UPDATE on public."retention_execution_runs" to "authenticated";
grant DELETE on public."retention_execution_runs" to "service_role";
grant INSERT on public."retention_execution_runs" to "service_role";
grant REFERENCES on public."retention_execution_runs" to "service_role";
grant SELECT on public."retention_execution_runs" to "service_role";
grant TRIGGER on public."retention_execution_runs" to "service_role";
grant TRUNCATE on public."retention_execution_runs" to "service_role";
grant UPDATE on public."retention_execution_runs" to "service_role";
grant DELETE on public."security_events" to "anon";
grant INSERT on public."security_events" to "anon";
grant REFERENCES on public."security_events" to "anon";
grant SELECT on public."security_events" to "anon";
grant TRIGGER on public."security_events" to "anon";
grant TRUNCATE on public."security_events" to "anon";
grant UPDATE on public."security_events" to "anon";
grant DELETE on public."security_events" to "authenticated";
grant INSERT on public."security_events" to "authenticated";
grant REFERENCES on public."security_events" to "authenticated";
grant SELECT on public."security_events" to "authenticated";
grant TRIGGER on public."security_events" to "authenticated";
grant TRUNCATE on public."security_events" to "authenticated";
grant UPDATE on public."security_events" to "authenticated";
grant DELETE on public."security_events" to "service_role";
grant INSERT on public."security_events" to "service_role";
grant REFERENCES on public."security_events" to "service_role";
grant SELECT on public."security_events" to "service_role";
grant TRIGGER on public."security_events" to "service_role";
grant TRUNCATE on public."security_events" to "service_role";
grant UPDATE on public."security_events" to "service_role";
grant DELETE on public."signup_signals" to "anon";
grant INSERT on public."signup_signals" to "anon";
grant REFERENCES on public."signup_signals" to "anon";
grant SELECT on public."signup_signals" to "anon";
grant TRIGGER on public."signup_signals" to "anon";
grant TRUNCATE on public."signup_signals" to "anon";
grant UPDATE on public."signup_signals" to "anon";
grant DELETE on public."signup_signals" to "authenticated";
grant INSERT on public."signup_signals" to "authenticated";
grant REFERENCES on public."signup_signals" to "authenticated";
grant SELECT on public."signup_signals" to "authenticated";
grant TRIGGER on public."signup_signals" to "authenticated";
grant TRUNCATE on public."signup_signals" to "authenticated";
grant UPDATE on public."signup_signals" to "authenticated";
grant DELETE on public."signup_signals" to "service_role";
grant INSERT on public."signup_signals" to "service_role";
grant REFERENCES on public."signup_signals" to "service_role";
grant SELECT on public."signup_signals" to "service_role";
grant TRIGGER on public."signup_signals" to "service_role";
grant TRUNCATE on public."signup_signals" to "service_role";
grant UPDATE on public."signup_signals" to "service_role";
grant DELETE on public."storage_usage" to "anon";
grant INSERT on public."storage_usage" to "anon";
grant REFERENCES on public."storage_usage" to "anon";
grant SELECT on public."storage_usage" to "anon";
grant TRIGGER on public."storage_usage" to "anon";
grant TRUNCATE on public."storage_usage" to "anon";
grant UPDATE on public."storage_usage" to "anon";
grant DELETE on public."storage_usage" to "authenticated";
grant INSERT on public."storage_usage" to "authenticated";
grant REFERENCES on public."storage_usage" to "authenticated";
grant SELECT on public."storage_usage" to "authenticated";
grant TRIGGER on public."storage_usage" to "authenticated";
grant TRUNCATE on public."storage_usage" to "authenticated";
grant UPDATE on public."storage_usage" to "authenticated";
grant DELETE on public."storage_usage" to "service_role";
grant INSERT on public."storage_usage" to "service_role";
grant REFERENCES on public."storage_usage" to "service_role";
grant SELECT on public."storage_usage" to "service_role";
grant TRIGGER on public."storage_usage" to "service_role";
grant TRUNCATE on public."storage_usage" to "service_role";
grant UPDATE on public."storage_usage" to "service_role";
grant DELETE on public."support_ticket_messages" to "anon";
grant INSERT on public."support_ticket_messages" to "anon";
grant REFERENCES on public."support_ticket_messages" to "anon";
grant SELECT on public."support_ticket_messages" to "anon";
grant TRIGGER on public."support_ticket_messages" to "anon";
grant TRUNCATE on public."support_ticket_messages" to "anon";
grant UPDATE on public."support_ticket_messages" to "anon";
grant DELETE on public."support_ticket_messages" to "authenticated";
grant INSERT on public."support_ticket_messages" to "authenticated";
grant REFERENCES on public."support_ticket_messages" to "authenticated";
grant SELECT on public."support_ticket_messages" to "authenticated";
grant TRIGGER on public."support_ticket_messages" to "authenticated";
grant TRUNCATE on public."support_ticket_messages" to "authenticated";
grant UPDATE on public."support_ticket_messages" to "authenticated";
grant DELETE on public."support_ticket_messages" to "service_role";
grant INSERT on public."support_ticket_messages" to "service_role";
grant REFERENCES on public."support_ticket_messages" to "service_role";
grant SELECT on public."support_ticket_messages" to "service_role";
grant TRIGGER on public."support_ticket_messages" to "service_role";
grant TRUNCATE on public."support_ticket_messages" to "service_role";
grant UPDATE on public."support_ticket_messages" to "service_role";
grant DELETE on public."support_tickets" to "anon";
grant INSERT on public."support_tickets" to "anon";
grant REFERENCES on public."support_tickets" to "anon";
grant SELECT on public."support_tickets" to "anon";
grant TRIGGER on public."support_tickets" to "anon";
grant TRUNCATE on public."support_tickets" to "anon";
grant UPDATE on public."support_tickets" to "anon";
grant DELETE on public."support_tickets" to "authenticated";
grant INSERT on public."support_tickets" to "authenticated";
grant REFERENCES on public."support_tickets" to "authenticated";
grant SELECT on public."support_tickets" to "authenticated";
grant TRIGGER on public."support_tickets" to "authenticated";
grant TRUNCATE on public."support_tickets" to "authenticated";
grant UPDATE on public."support_tickets" to "authenticated";
grant DELETE on public."support_tickets" to "service_role";
grant INSERT on public."support_tickets" to "service_role";
grant REFERENCES on public."support_tickets" to "service_role";
grant SELECT on public."support_tickets" to "service_role";
grant TRIGGER on public."support_tickets" to "service_role";
grant TRUNCATE on public."support_tickets" to "service_role";
grant UPDATE on public."support_tickets" to "service_role";
grant DELETE on public."system_prompt_versions" to "anon";
grant INSERT on public."system_prompt_versions" to "anon";
grant REFERENCES on public."system_prompt_versions" to "anon";
grant SELECT on public."system_prompt_versions" to "anon";
grant TRIGGER on public."system_prompt_versions" to "anon";
grant TRUNCATE on public."system_prompt_versions" to "anon";
grant UPDATE on public."system_prompt_versions" to "anon";
grant DELETE on public."system_prompt_versions" to "authenticated";
grant INSERT on public."system_prompt_versions" to "authenticated";
grant REFERENCES on public."system_prompt_versions" to "authenticated";
grant SELECT on public."system_prompt_versions" to "authenticated";
grant TRIGGER on public."system_prompt_versions" to "authenticated";
grant TRUNCATE on public."system_prompt_versions" to "authenticated";
grant UPDATE on public."system_prompt_versions" to "authenticated";
grant DELETE on public."system_prompt_versions" to "service_role";
grant INSERT on public."system_prompt_versions" to "service_role";
grant REFERENCES on public."system_prompt_versions" to "service_role";
grant SELECT on public."system_prompt_versions" to "service_role";
grant TRIGGER on public."system_prompt_versions" to "service_role";
grant TRUNCATE on public."system_prompt_versions" to "service_role";
grant UPDATE on public."system_prompt_versions" to "service_role";
grant DELETE on public."tool_engine_config" to "anon";
grant INSERT on public."tool_engine_config" to "anon";
grant REFERENCES on public."tool_engine_config" to "anon";
grant SELECT on public."tool_engine_config" to "anon";
grant TRIGGER on public."tool_engine_config" to "anon";
grant TRUNCATE on public."tool_engine_config" to "anon";
grant UPDATE on public."tool_engine_config" to "anon";
grant DELETE on public."tool_engine_config" to "authenticated";
grant INSERT on public."tool_engine_config" to "authenticated";
grant REFERENCES on public."tool_engine_config" to "authenticated";
grant SELECT on public."tool_engine_config" to "authenticated";
grant TRIGGER on public."tool_engine_config" to "authenticated";
grant TRUNCATE on public."tool_engine_config" to "authenticated";
grant UPDATE on public."tool_engine_config" to "authenticated";
grant DELETE on public."tool_engine_config" to "service_role";
grant INSERT on public."tool_engine_config" to "service_role";
grant REFERENCES on public."tool_engine_config" to "service_role";
grant SELECT on public."tool_engine_config" to "service_role";
grant TRIGGER on public."tool_engine_config" to "service_role";
grant TRUNCATE on public."tool_engine_config" to "service_role";
grant UPDATE on public."tool_engine_config" to "service_role";
grant DELETE on public."tool_input_fields" to "anon";
grant INSERT on public."tool_input_fields" to "anon";
grant REFERENCES on public."tool_input_fields" to "anon";
grant SELECT on public."tool_input_fields" to "anon";
grant TRIGGER on public."tool_input_fields" to "anon";
grant TRUNCATE on public."tool_input_fields" to "anon";
grant UPDATE on public."tool_input_fields" to "anon";
grant DELETE on public."tool_input_fields" to "authenticated";
grant INSERT on public."tool_input_fields" to "authenticated";
grant REFERENCES on public."tool_input_fields" to "authenticated";
grant SELECT on public."tool_input_fields" to "authenticated";
grant TRIGGER on public."tool_input_fields" to "authenticated";
grant TRUNCATE on public."tool_input_fields" to "authenticated";
grant UPDATE on public."tool_input_fields" to "authenticated";
grant DELETE on public."tool_input_fields" to "service_role";
grant INSERT on public."tool_input_fields" to "service_role";
grant REFERENCES on public."tool_input_fields" to "service_role";
grant SELECT on public."tool_input_fields" to "service_role";
grant TRIGGER on public."tool_input_fields" to "service_role";
grant TRUNCATE on public."tool_input_fields" to "service_role";
grant UPDATE on public."tool_input_fields" to "service_role";
grant DELETE on public."tool_model_configs" to "anon";
grant INSERT on public."tool_model_configs" to "anon";
grant REFERENCES on public."tool_model_configs" to "anon";
grant SELECT on public."tool_model_configs" to "anon";
grant TRIGGER on public."tool_model_configs" to "anon";
grant TRUNCATE on public."tool_model_configs" to "anon";
grant UPDATE on public."tool_model_configs" to "anon";
grant DELETE on public."tool_model_configs" to "authenticated";
grant INSERT on public."tool_model_configs" to "authenticated";
grant REFERENCES on public."tool_model_configs" to "authenticated";
grant SELECT on public."tool_model_configs" to "authenticated";
grant TRIGGER on public."tool_model_configs" to "authenticated";
grant TRUNCATE on public."tool_model_configs" to "authenticated";
grant UPDATE on public."tool_model_configs" to "authenticated";
grant DELETE on public."tool_model_configs" to "service_role";
grant INSERT on public."tool_model_configs" to "service_role";
grant REFERENCES on public."tool_model_configs" to "service_role";
grant SELECT on public."tool_model_configs" to "service_role";
grant TRIGGER on public."tool_model_configs" to "service_role";
grant TRUNCATE on public."tool_model_configs" to "service_role";
grant UPDATE on public."tool_model_configs" to "service_role";
grant DELETE on public."user_notifications" to "anon";
grant INSERT on public."user_notifications" to "anon";
grant REFERENCES on public."user_notifications" to "anon";
grant SELECT on public."user_notifications" to "anon";
grant TRIGGER on public."user_notifications" to "anon";
grant TRUNCATE on public."user_notifications" to "anon";
grant UPDATE on public."user_notifications" to "anon";
grant DELETE on public."user_notifications" to "authenticated";
grant INSERT on public."user_notifications" to "authenticated";
grant REFERENCES on public."user_notifications" to "authenticated";
grant SELECT on public."user_notifications" to "authenticated";
grant TRIGGER on public."user_notifications" to "authenticated";
grant TRUNCATE on public."user_notifications" to "authenticated";
grant UPDATE on public."user_notifications" to "authenticated";
grant DELETE on public."user_notifications" to "service_role";
grant INSERT on public."user_notifications" to "service_role";
grant REFERENCES on public."user_notifications" to "service_role";
grant SELECT on public."user_notifications" to "service_role";
grant TRIGGER on public."user_notifications" to "service_role";
grant TRUNCATE on public."user_notifications" to "service_role";
grant UPDATE on public."user_notifications" to "service_role";
grant DELETE on public."weekly_challenges" to "anon";
grant INSERT on public."weekly_challenges" to "anon";
grant REFERENCES on public."weekly_challenges" to "anon";
grant SELECT on public."weekly_challenges" to "anon";
grant TRIGGER on public."weekly_challenges" to "anon";
grant TRUNCATE on public."weekly_challenges" to "anon";
grant UPDATE on public."weekly_challenges" to "anon";
grant DELETE on public."weekly_challenges" to "authenticated";
grant INSERT on public."weekly_challenges" to "authenticated";
grant REFERENCES on public."weekly_challenges" to "authenticated";
grant SELECT on public."weekly_challenges" to "authenticated";
grant TRIGGER on public."weekly_challenges" to "authenticated";
grant TRUNCATE on public."weekly_challenges" to "authenticated";
grant UPDATE on public."weekly_challenges" to "authenticated";
grant DELETE on public."weekly_challenges" to "service_role";
grant INSERT on public."weekly_challenges" to "service_role";
grant REFERENCES on public."weekly_challenges" to "service_role";
grant SELECT on public."weekly_challenges" to "service_role";
grant TRIGGER on public."weekly_challenges" to "service_role";
grant TRUNCATE on public."weekly_challenges" to "service_role";
grant UPDATE on public."weekly_challenges" to "service_role";
grant DELETE on public."workspace_sources" to "anon";
grant INSERT on public."workspace_sources" to "anon";
grant REFERENCES on public."workspace_sources" to "anon";
grant SELECT on public."workspace_sources" to "anon";
grant TRIGGER on public."workspace_sources" to "anon";
grant TRUNCATE on public."workspace_sources" to "anon";
grant UPDATE on public."workspace_sources" to "anon";
grant DELETE on public."workspace_sources" to "authenticated";
grant INSERT on public."workspace_sources" to "authenticated";
grant REFERENCES on public."workspace_sources" to "authenticated";
grant SELECT on public."workspace_sources" to "authenticated";
grant TRIGGER on public."workspace_sources" to "authenticated";
grant TRUNCATE on public."workspace_sources" to "authenticated";
grant UPDATE on public."workspace_sources" to "authenticated";
grant DELETE on public."workspace_sources" to "service_role";
grant INSERT on public."workspace_sources" to "service_role";
grant REFERENCES on public."workspace_sources" to "service_role";
grant SELECT on public."workspace_sources" to "service_role";
grant TRIGGER on public."workspace_sources" to "service_role";
grant TRUNCATE on public."workspace_sources" to "service_role";
grant UPDATE on public."workspace_sources" to "service_role";
grant DELETE on public."workspaces" to "anon";
grant INSERT on public."workspaces" to "anon";
grant REFERENCES on public."workspaces" to "anon";
grant SELECT on public."workspaces" to "anon";
grant TRIGGER on public."workspaces" to "anon";
grant TRUNCATE on public."workspaces" to "anon";
grant UPDATE on public."workspaces" to "anon";
grant DELETE on public."workspaces" to "authenticated";
grant INSERT on public."workspaces" to "authenticated";
grant REFERENCES on public."workspaces" to "authenticated";
grant SELECT on public."workspaces" to "authenticated";
grant TRIGGER on public."workspaces" to "authenticated";
grant TRUNCATE on public."workspaces" to "authenticated";
grant UPDATE on public."workspaces" to "authenticated";
grant DELETE on public."workspaces" to "service_role";
grant INSERT on public."workspaces" to "service_role";
grant REFERENCES on public."workspaces" to "service_role";
grant SELECT on public."workspaces" to "service_role";
grant TRIGGER on public."workspaces" to "service_role";
grant TRUNCATE on public."workspaces" to "service_role";
grant UPDATE on public."workspaces" to "service_role";
CREATE TRIGGER guard_logo_wizard_content_write BEFORE INSERT OR UPDATE OF logo_wizard_content ON public.app_settings FOR EACH ROW EXECUTE FUNCTION guard_logo_wizard_content_write();
CREATE TRIGGER guard_generation_job_transition BEFORE INSERT OR UPDATE ON public.generation_jobs FOR EACH ROW EXECUTE FUNCTION guard_generation_job_transition();
CREATE TRIGGER maro_generation_conversation_metadata BEFORE INSERT ON public.generations FOR EACH ROW EXECUTE FUNCTION maro_generation_conversation_metadata();
CREATE TRIGGER maro_prompts_search_text_sync BEFORE INSERT OR UPDATE OF title, category, keywords, description ON public.maro_prompts FOR EACH ROW EXECUTE FUNCTION sync_maro_preset_search_text();
CREATE TRIGGER profiles_sync_admin_flags BEFORE INSERT OR UPDATE OF access_role, is_admin ON public.profiles FOR EACH ROW EXECUTE FUNCTION sync_profile_admin_flags();
CREATE TRIGGER maro_brain_paid_update BEFORE INSERT OR UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION maro_guard_brain_update();
CREATE TRIGGER workspaces_entitlement_check BEFORE INSERT ON public.workspaces FOR EACH ROW EXECUTE FUNCTION enforce_workspace_entitlement();
commit;
