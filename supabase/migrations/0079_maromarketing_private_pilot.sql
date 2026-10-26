-- Additive private pilot. No changes to public billing, customer content or existing functions.
begin;
create table public.maro_marketing_campaigns (
 id uuid primary key, owner_id uuid not null references auth.users(id) on delete cascade,
 workspace_id text not null references public.workspaces(id) on delete cascade,
 fingerprint text not null, brand text not null, brief jsonb not null, plan jsonb,
 status text not null default 'generating' check(status in ('generating','completed','failed')),
 revision integer not null default 0, created_at timestamptz not null default now(),
 reserved_usd numeric not null default .1 check(reserved_usd >= 0), estimated_usd numeric check(estimated_usd >= 0),
 input_tokens integer not null default 0, cached_tokens integer not null default 0, output_tokens integer not null default 0,
 search_calls integer not null default 0, model text not null, provider_response_id text, error_code text
);
create index on public.maro_marketing_campaigns(owner_id,workspace_id,created_at desc);
create table public.maro_marketing_social_profiles (
 workspace_id text primary key references public.workspaces(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade, provider_id text unique,
 created_at timestamptz not null default now()
);
create table public.maro_marketing_publications (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 workspace_id text not null references public.workspaces(id) on delete cascade,
 campaign_id uuid not null references public.maro_marketing_campaigns(id) on delete cascade,
 post_id uuid not null, account_id text not null, platform text not null, account_name text not null,
 snapshot jsonb not null, status text not null default 'sending', provider_id text, url text,
 media_token_hash text unique, media_expires_at timestamptz,
 scheduled_for timestamptz, created_at timestamptz not null default now(), error_code text
);
-- A confirmed cancelled schedule may be replaced; uncertain/failed sends cannot create duplicates.
create unique index maro_marketing_one_active_publication on public.maro_marketing_publications(campaign_id,post_id,account_id) where status <> 'cancelled';
create index on public.maro_marketing_publications(owner_id,workspace_id,created_at desc);
alter table public.maro_marketing_campaigns enable row level security;
alter table public.maro_marketing_social_profiles enable row level security;
alter table public.maro_marketing_publications enable row level security;
revoke all on public.maro_marketing_campaigns,public.maro_marketing_social_profiles,public.maro_marketing_publications from public,anon,authenticated;
grant all on public.maro_marketing_campaigns,public.maro_marketing_social_profiles,public.maro_marketing_publications to service_role;

create function public.maro_marketing_guard(p_user uuid,p_workspace text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from auth.users where id=p_user and lower(trim(email))='erzen@nice.al' and email_confirmed_at is not null) then raise exception 'MARKETING_FORBIDDEN'; end if;
 if not exists(select 1 from public.workspaces where id=p_workspace and owner_id=p_user) then raise exception 'WORKSPACE_NOT_FOUND'; end if;
end; $$;

create function public.maro_marketing_reserve(p_user uuid,p_workspace text,p_id uuid,p_fingerprint text,p_brand text,p_brief jsonb,p_model text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare existing public.maro_marketing_campaigns; day_start timestamptz; month_start timestamptz;
begin
 perform public.maro_marketing_guard(p_user,p_workspace);
 perform pg_advisory_xact_lock(hashtextextended('maro_marketing:'||p_user::text,0));
 select * into existing from public.maro_marketing_campaigns where id=p_id;
 if found then
  if existing.owner_id<>p_user or existing.workspace_id<>p_workspace or existing.fingerprint<>p_fingerprint then raise exception 'REQUEST_CONFLICT'; end if;
  if existing.status='generating' and existing.created_at < now()-interval '5 minutes' then
   update public.maro_marketing_campaigns set status='failed',error_code='result_unknown' where id=p_id;
  end if;
  return jsonb_build_object('existing',true);
 end if;
 update public.maro_marketing_campaigns set status='failed',error_code='result_unknown' where owner_id=p_user and status='generating' and created_at<now()-interval '5 minutes';
 if exists(select 1 from public.maro_marketing_campaigns where owner_id=p_user and status='generating') then raise exception 'MARKETING_BUSY'; end if;
 day_start := date_trunc('day',now() at time zone 'Europe/Berlin') at time zone 'Europe/Berlin';
 month_start := date_trunc('month',now() at time zone 'Europe/Berlin') at time zone 'Europe/Berlin';
 if (select coalesce(sum(coalesce(estimated_usd,reserved_usd)),0) from public.maro_marketing_campaigns where owner_id=p_user and created_at>=day_start)+.1>2 then raise exception 'MARKETING_DAILY_LIMIT'; end if;
 if (select coalesce(sum(coalesce(estimated_usd,reserved_usd)),0) from public.maro_marketing_campaigns where owner_id=p_user and created_at>=month_start)+.1>10 then raise exception 'MARKETING_MONTHLY_LIMIT'; end if;
 insert into public.maro_marketing_campaigns(id,owner_id,workspace_id,fingerprint,brand,brief,model) values(p_id,p_user,p_workspace,p_fingerprint,p_brand,p_brief,p_model);
 return jsonb_build_object('existing',false);
end; $$;
revoke all on function public.maro_marketing_guard(uuid,text),public.maro_marketing_reserve(uuid,text,uuid,text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.maro_marketing_guard(uuid,text),public.maro_marketing_reserve(uuid,text,uuid,text,text,jsonb,text) to service_role;
commit;
