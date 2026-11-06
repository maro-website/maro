-- Switch the catalog only after the Railway release accepts both provider versions.
begin;

CREATE OR REPLACE FUNCTION public.admin_save_v1_models(p_tool text, p_models jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
      and ((provider='openai' and model_id in ('flare','sunburst') and metadata->>'providerModelId' in ('gpt-image-2.5-'||model_id,'gpt-image-2.6-'||model_id))
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
end $function$;

do $catalog$
begin
  perform 1 from public.tool_engine_config
  where tool_id in ('maro_imazh', 'maro_logo')
  order by tool_id for update;

  if (
    select count(*) from public.tool_model_configs
    where (tool_id, model_id) in (('maro_imazh', 'flare'), ('maro_imazh', 'sunburst'), ('maro_logo', 'flare'))
      and provider = 'openai'
      and metadata->>'providerModelId' in ('gpt-image-2.5-' || model_id, 'gpt-image-2.6-' || model_id)
  ) <> 3 then
    raise exception 'Unexpected OpenAI image catalog';
  end if;

  update public.tool_model_configs
  set metadata = jsonb_set(metadata, '{providerModelId}', to_jsonb('gpt-image-2.6-' || model_id)),
      updated_at = clock_timestamp()
  where (tool_id, model_id) in (('maro_imazh', 'flare'), ('maro_imazh', 'sunburst'), ('maro_logo', 'flare'))
    and provider = 'openai'
    and metadata->>'providerModelId' = 'gpt-image-2.5-' || model_id;
end
$catalog$;

commit;
