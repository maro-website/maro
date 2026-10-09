-- Restricted operator tool. Replace exactly this placeholder with the verified
-- account UUID. Do not put a customer's export into source control or logs.
begin transaction read only;
set local privacy.target_user = 'REPLACE_WITH_VERIFIED_UUID';
do $$ begin
  if not exists (select 1 from public.profiles where id=current_setting('privacy.target_user')::uuid) then
    raise exception 'privacy_export_unknown_user';
  end if;
end $$;
select jsonb_build_object(
  'account', (select to_jsonb(p)-array['is_admin','access_role','risk_score','device_fingerprint_hash'] from public.profiles p where p.id=current_setting('privacy.target_user')::uuid),
  'workspaces', coalesce((select jsonb_agg(to_jsonb(w)) from public.workspaces w where w.owner_id=current_setting('privacy.target_user')::uuid),'[]'::jsonb),
  'creations', coalesce((select jsonb_agg(to_jsonb(g)-array['final_prompt','fort']) from public.generations g where g.user_id=current_setting('privacy.target_user')::uuid),'[]'::jsonb),
  'jobs', coalesce((select jsonb_agg(to_jsonb(j)) from (select id,user_id,module,model,status,credits_reserved,credits_charged,started_at,finished_at,created_at from public.generation_jobs where user_id=current_setting('privacy.target_user')::uuid) j),'[]'::jsonb),
  'credit_history', coalesce((select jsonb_agg(to_jsonb(t)-'metadata') from public.credit_transactions t where t.user_id=current_setting('privacy.target_user')::uuid),'[]'::jsonb),
  'support_tickets', coalesce((select jsonb_agg(to_jsonb(t)-array['metadata','assigned_to']) from public.support_tickets t where t.user_id=current_setting('privacy.target_user')::uuid),'[]'::jsonb),
  'support_messages', coalesce((select jsonb_agg(to_jsonb(m)-'author_id') from public.support_ticket_messages m join public.support_tickets t on t.id=m.ticket_id where t.user_id=current_setting('privacy.target_user')::uuid and m.internal=false),'[]'::jsonb)
) as customer_export;
rollback;
