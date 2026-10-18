-- Native Recraft catalog. Existing prices, defaults, prompts, jobs and balances are retained.
begin;
insert into public.tool_model_configs
  (tool_id,model_id,display_name,provider,enabled,is_default,is_fallback,coming_soon,sort_order,cost_metadata,metadata)
select 'maro_imazh',m.id,m.label,'recraft',true,false,false,false,10+m.ordinality::integer,
  jsonb_build_object('customerCredits',5,'pricingStage','internal'),
  jsonb_build_object('providerModelId',m.id,'description',
    case when m.id like '%_vector' then 'Vector · shfaqet dhe ruhet si PNG'
      when m.id like '%_styles%' then 'Kërkon referencë stili'
      when m.id='recraftv4_1_flash' then 'Gjenerim i shpejtë · pa imazhe referencë'
      when m.id like 'recraftv2%' then 'Prompt deri 1,000 karaktere · referencat si stil'
      when m.id like 'recraftv3%' then 'Prompt deri 1,000 karaktere · një referencë'
      else 'Gjenerim dhe ndryshim me një referencë' end,
    'rollout','erzen-only','catalogVerifiedAt','2026-10-18')
from jsonb_to_recordset('[
  {"id":"recraftv4_1","label":"Recraft V4.1","ordinality":1},
  {"id":"recraftv4_1_flash","label":"Recraft V4.1 Flash","ordinality":2},
  {"id":"recraftv4_1_pro","label":"Recraft V4.1 Pro","ordinality":3},
  {"id":"recraftv4_1_vector","label":"Recraft V4.1 Vector","ordinality":4},
  {"id":"recraftv4_1_pro_vector","label":"Recraft V4.1 Pro Vector","ordinality":5},
  {"id":"recraftv4_1_utility","label":"Recraft V4.1 Utility","ordinality":6},
  {"id":"recraftv4_1_utility_pro","label":"Recraft V4.1 Utility Pro","ordinality":7},
  {"id":"recraftv4","label":"Recraft V4","ordinality":8},
  {"id":"recraftv4_pro","label":"Recraft V4 Pro","ordinality":9},
  {"id":"recraftv4_vector","label":"Recraft V4 Vector","ordinality":10},
  {"id":"recraftv4_pro_vector","label":"Recraft V4 Pro Vector","ordinality":11},
  {"id":"recraftv4_styles","label":"Recraft V4 Styles","ordinality":12},
  {"id":"recraftv4_styles_pro","label":"Recraft V4 Styles Pro","ordinality":13},
  {"id":"recraftv4_styles_vector","label":"Recraft V4 Styles Vector","ordinality":14},
  {"id":"recraftv4_styles_pro_vector","label":"Recraft V4 Styles Pro Vector","ordinality":15},
  {"id":"recraftv3","label":"Recraft V3","ordinality":16},
  {"id":"recraftv3_vector","label":"Recraft V3 Vector","ordinality":17},
  {"id":"recraftv2","label":"Recraft V2","ordinality":18},
  {"id":"recraftv2_vector","label":"Recraft V2 Vector","ordinality":19},
  {"id":"recraftv4_1_utility_vector","label":"Recraft V4.1 Utility Vector","ordinality":20},
  {"id":"recraftv4_1_utility_pro_vector","label":"Recraft V4.1 Utility Pro Vector","ordinality":21}
]') as m(id text,label text,ordinality integer)
on conflict(tool_id,model_id) do nothing;

create or replace function public.admin_save_v1_models(p_tool text,p_models jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare m jsonb; expected_count integer;
  recraft_ids constant text[] := array[
    'recraftv4_1','recraftv4_1_flash','recraftv4_1_pro','recraftv4_1_vector','recraftv4_1_pro_vector',
    'recraftv4_1_utility','recraftv4_1_utility_pro','recraftv4','recraftv4_pro','recraftv4_vector','recraftv4_pro_vector',
    'recraftv4_styles','recraftv4_styles_pro','recraftv4_styles_vector','recraftv4_styles_pro_vector',
    'recraftv3','recraftv3_vector','recraftv2','recraftv2_vector','recraftv4_1_utility_vector','recraftv4_1_utility_pro_vector'];
begin
  if p_tool not in ('maro_imazh','maro_logo') then raise exception 'invalid_module'; end if;
  perform 1 from public.tool_engine_config where tool_id=p_tool for update;
  select count(*) into expected_count from public.tool_model_configs where tool_id=p_tool
    and (model_id='flare' or (p_tool='maro_imazh' and (model_id='sunburst' or model_id=any(recraft_ids))));
  if jsonb_typeof(p_models) is distinct from 'array' then raise exception 'invalid_model_set'; end if;
  if jsonb_array_length(p_models)<>expected_count then raise exception 'invalid_model_set'; end if;
  if (select count(distinct value->>'key') from jsonb_array_elements(p_models))<>expected_count
    or (select count(*) from jsonb_array_elements(p_models) where value->>'isDefault'='true')<>1
    or (select count(*) from jsonb_array_elements(p_models) where value->>'isDefault'='true' and value->>'enabled'='true')<>1
    then raise exception 'invalid_default'; end if;
  for m in select value from jsonb_array_elements(p_models) loop
    if m->>'key' is null or not (m->>'key' in ('flare','sunburst') or m->>'key'=any(recraft_ids))
      or (p_tool='maro_logo' and m->>'key'<>'flare')
      or (m->>'key'=any(recraft_ids) and m->>'isDefault' is distinct from 'false')
      or jsonb_typeof(m->'enabled') is distinct from 'boolean' or jsonb_typeof(m->'isDefault') is distinct from 'boolean'
      or jsonb_typeof(m->'customerCredits') is distinct from 'number' or (m->>'customerCredits') !~ '^[1-9][0-9]*$'
      or (m->>'customerCredits')::numeric>2147483647
      or jsonb_typeof(m->'order') is distinct from 'number' or (m->>'order') !~ '^[0-9]+$'
      or (m->>'order')::numeric>2147483647
      or jsonb_typeof(m->'label') is distinct from 'string' or length(btrim(m->>'label')) not between 1 and 80
      or jsonb_typeof(m->'descriptor') is distinct from 'string' or length(m->>'descriptor')>240
      then raise exception 'invalid_model_configuration'; end if;
    if not exists(select 1 from public.tool_model_configs where tool_id=p_tool and model_id=m->>'key'
      and ((provider='openai' and model_id in ('flare','sunburst') and metadata->>'providerModelId'='gpt-image-2.5-'||model_id)
        or (provider='recraft' and model_id=any(recraft_ids) and metadata->>'providerModelId'=model_id)))
      then raise exception 'model_not_configured'; end if;
  end loop;
  update public.tool_model_configs set is_default=false where tool_id=p_tool and is_default;
  for m in select value from jsonb_array_elements(p_models) loop
    update public.tool_model_configs set display_name=btrim(m->>'label'),enabled=(m->>'enabled')::boolean,
      is_default=(m->>'isDefault')::boolean,coming_soon=false,sort_order=(m->>'order')::integer,
      metadata=metadata||jsonb_build_object('description',m->>'descriptor'),
      cost_metadata=cost_metadata||jsonb_build_object('customerCredits',(m->>'customerCredits')::integer),updated_at=clock_timestamp()
      where tool_id=p_tool and model_id=m->>'key';
  end loop;
end $$;
revoke all on function public.admin_save_v1_models(text,jsonb) from public,anon,authenticated;
grant execute on function public.admin_save_v1_models(text,jsonb) to service_role;
commit;
