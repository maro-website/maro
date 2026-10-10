-- Production receipts and V1 usage; test rows remain in the ledger.
begin;
create view public.admin_real_paid_orders with (security_invoker=true) as
select o.* from public.credit_orders o
where o.status='paid' and o.paid_at is not null and o.provider in ('raiaccept','paddle','raiffeisen')
  and coalesce(o.commercial_snapshot->>'environment','production')<>'sandbox'
  and (o.provider<>'raiaccept' or exists(select 1 from public.raiaccept_checkouts c
    where c.order_id=o.id and c.environment='production' and c.fulfillment_state='fulfilled'
      and c.payment_state in ('paid','partially_refunded','fully_refunded')));
revoke all on public.admin_real_paid_orders from public,anon,authenticated;
grant select on public.admin_real_paid_orders to service_role;
create function public.admin_analytics_snapshot(p_days integer default 30,p_months integer default 6)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb; today timestamptz := date_trunc('day',now() at time zone 'Europe/Tirane') at time zone 'Europe/Tirane';
begin
  if auth.role() is distinct from 'service_role' then raise exception 'forbidden' using errcode='42501'; end if;
  if p_days is null or p_days not between 1 and 365 or p_months is null or p_months not between 1 and 24 then raise exception 'invalid_period'; end if;
  with currency_totals as (
    select currency,count(*) as orders,sum(amount_cents) as cents from admin_real_paid_orders group by currency
  ), monthly as (
    select to_char(paid_at at time zone 'Europe/Tirane','YYYY-MM') as month,currency,count(*) as orders,sum(amount_cents)/100.0 as amount
    from admin_real_paid_orders where paid_at >= (date_trunc('month',now() at time zone 'Europe/Tirane') - (p_months-1)*interval '1 month') at time zone 'Europe/Tirane'
    group by 1,2
  ), days as (
    select (today at time zone 'Europe/Tirane')::date-i as day from generate_series(0,p_days-1) i
  ), signup_days as (
    select (created_at at time zone 'Europe/Tirane')::date as day,count(*) as signups from profiles
    where created_at>=((today at time zone 'Europe/Tirane')-(p_days-1)*interval '1 day') at time zone 'Europe/Tirane' group by 1
  ), job_days as (
    select (created_at at time zone 'Europe/Tirane')::date as day,count(*) as attempts,count(*) filter(where status='completed') as completed
    from generation_jobs where module in ('reklama','logo') and created_at>=((today at time zone 'Europe/Tirane')-(p_days-1)*interval '1 day') at time zone 'Europe/Tirane' group by 1
  ), daily as (
    select d.day,coalesce(s.signups,0) signups,coalesce(j.attempts,0) attempts,coalesce(j.completed,0) completed
    from days d left join signup_days s using(day) left join job_days j using(day)
  ), tools as (
    select case module when 'logo' then 'maroLogo' else 'maroImazh' end as tool,count(*) as attempts,
      count(*) filter(where status='completed') as count,coalesce(sum(credits_charged) filter(where status='completed'),0) as credits
    from generation_jobs where module in ('reklama','logo') and created_at>=((today at time zone 'Europe/Tirane')-(p_days-1)*interval '1 day') at time zone 'Europe/Tirane' group by module
  ) select jsonb_build_object(
    'updatedAt',now(),'timezone','Europe/Tirane','dayStartsAt',today,
    'overview',jsonb_build_object(
      'usersTotal',(select count(*) from profiles),'usersCreators',(select count(*) from profiles where is_creator),
      'generationsTotal',(select count(*) from generations where tool_id in ('reklama','logo')),
      'generationsLast7d',(select count(*) from generation_jobs where module in ('reklama','logo') and status='completed' and created_at>=now()-interval '7 days'),
      'ordersPaid',(select count(*) from admin_real_paid_orders),
      'revenueEur',coalesce((select cents/100.0 from currency_totals where currency='EUR'),0),
      'creditsSpentLast7d',coalesce((select sum(credits_charged) from generation_jobs where module in ('reklama','logo') and status='completed' and finished_at>=now()-interval '7 days'),0),
      'excludedPaidOrders',(select count(*) from credit_orders o where status='paid' and not exists(select 1 from admin_real_paid_orders r where r.id=o.id)),
      'receiptsByCurrency',coalesce((select jsonb_agg(jsonb_build_object('currency',currency,'orders',orders,'amount',cents/100.0) order by currency) from currency_totals),'[]'::jsonb)),
    'byTool',coalesce((select jsonb_agg(to_jsonb(t) order by t.count desc) from tools t),'[]'::jsonb),
    'byMonth',coalesce((select jsonb_agg(to_jsonb(m) order by month,currency) from monthly m),'[]'::jsonb),
    'daily',coalesce((select jsonb_agg(to_jsonb(d) order by day) from daily d),'[]'::jsonb),
    'today',jsonb_build_object(
      'revenueEur',coalesce((select sum(amount_cents)/100.0 from admin_real_paid_orders where currency='EUR' and paid_at>=today),0),
      'generations',(select count(*) from generation_jobs where module in ('reklama','logo') and created_at>=today),
      'completed',(select count(*) from generation_jobs where module in ('reklama','logo') and created_at>=today and status='completed'),
      'terminal',(select count(*) from generation_jobs where module in ('reklama','logo') and created_at>=today and status in ('completed','failed','cancelled')),
      'activeUsers',(select count(distinct user_id) from generation_jobs where module in ('reklama','logo') and created_at>=today),
      'aiCostUsd',coalesce((select sum(provider_cost_usd) from generation_jobs where module in ('reklama','logo') and status='completed' and finished_at>=today),0),
      'costMissing',(select count(*) from generation_jobs where module in ('reklama','logo') and status='completed' and finished_at>=today and provider_cost_usd is null),
      'attention',(select count(*) from reports where status='open')+(select count(*) from generation_jobs where module in ('reklama','logo') and created_at>=today and status='failed'))
  ) into result;
  return result;
end;
$$;
revoke all on function public.admin_analytics_snapshot(integer,integer) from public,anon,authenticated;
grant execute on function public.admin_analytics_snapshot(integer,integer) to service_role;
notify pgrst,'reload schema';
commit;
