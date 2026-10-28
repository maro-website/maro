-- Prepared locally only. Apply after explicit approval of the live database migration.
-- The existing private-beta application gate is intentionally unchanged.
ALTER TABLE public.maro_moods
  ADD COLUMN input_text text NOT NULL DEFAULT '' CHECK (length(input_text) <= 1600),
  ADD COLUMN visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
  ADD COLUMN status text NOT NULL DEFAULT 'pending' CHECK (status IN ('processing','pending','approved','rejected','failed')),
  ADD COLUMN source text NOT NULL DEFAULT 'community' CHECK (source IN ('platform','community')),
  ADD COLUMN publisher_name text NOT NULL DEFAULT 'Krijues' CHECK (length(publisher_name) BETWEEN 1 AND 80),
  ADD COLUMN rejection_reason text CHECK (length(rejection_reason) <= 500),
  ADD COLUMN reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN reviewed_at timestamptz,
  ADD COLUMN request_id uuid,
  ADD COLUMN ai_model text,
  ADD COLUMN input_tokens integer NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  ADD COLUMN output_tokens integer NOT NULL DEFAULT 0 CHECK (output_tokens >= 0);

UPDATE public.maro_moods SET source='platform', status=CASE WHEN active THEN 'approved' ELSE 'pending' END,
  input_text=description, publisher_name='Erzen',
  created_by=COALESCE(created_by, (SELECT id FROM auth.users WHERE lower(email)='erzen@nice.al' LIMIT 1));

ALTER TABLE public.maro_moods ADD CONSTRAINT maro_styles_approval_gate CHECK (NOT active OR status='approved');
CREATE UNIQUE INDEX maro_styles_request_idx ON public.maro_moods(created_by,request_id) WHERE request_id IS NOT NULL;
CREATE INDEX maro_styles_catalog_idx ON public.maro_moods(status,visibility,sort_order,id);
CREATE INDEX maro_styles_owner_idx ON public.maro_moods(created_by,created_at DESC);
COMMENT ON COLUMN public.maro_moods.prompt IS 'Server-only expanded style instructions; never return in client responses.';
-- Existing restrictive RLS/grants are preserved. New covers use the private generations
-- bucket under _moods/, outside the generic user-owned asset namespace.
