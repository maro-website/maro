begin;
alter table public.raiaccept_receipt_jobs add column lease_id uuid,add column lease_started_at timestamptz,
  add column first_attempt_at timestamptz,add column request_payload jsonb,add column provider_message_id text;
alter table public.raiaccept_receipt_jobs alter column next_attempt_at drop not null;

create function public.claim_raiaccept_receipts(p_environment text,p_merchant text,p_limit integer default 3)
returns jsonb language plpgsql security definer set search_path=public as $$
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
end;$$;

create function public.prepare_raiaccept_receipt(p_order_id uuid,p_lease uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
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
end;$$;

create function public.finish_raiaccept_receipt(p_order_id uuid,p_lease uuid,p_sent boolean,p_message_id text default null,p_error text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
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
end;$$;
revoke all on function public.claim_raiaccept_receipts(text,text,integer),public.prepare_raiaccept_receipt(uuid,uuid,jsonb),public.finish_raiaccept_receipt(uuid,uuid,boolean,text,text) from public,anon,authenticated;
grant execute on function public.claim_raiaccept_receipts(text,text,integer),public.prepare_raiaccept_receipt(uuid,uuid,jsonb),public.finish_raiaccept_receipt(uuid,uuid,boolean,text,text) to service_role;
notify pgrst,'reload schema';
commit;
