-- maroImazh controlled runtime shadow activation (compile-only)
-- Requires 0025_control_center_build.sql (engine_shadow_imazh flag)

update public.feature_flags
set enabled = true,
    metadata = coalesce(metadata, '{}'::jsonb) || '{"description":"maroImazh shadow mode — runtime compile/map only"}'::jsonb,
    updated_at = now()
where key = 'engine_shadow_imazh';

update public.tool_engine_config
set production_pipeline = 'shadow',
    updated_at = now()
where tool_id = 'maro_imazh';

-- Safety: maroImazh Engine LIVE remains off; legacy OpenAI path stays production-facing.
-- Do NOT set prompt_compiler_v2 here.

notify pgrst, 'reload schema';
