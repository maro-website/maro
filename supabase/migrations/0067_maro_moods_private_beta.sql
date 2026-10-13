-- Additive private beta. No changes to existing prompts, credits or generation tables.
CREATE TABLE public.maro_moods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 140),
  description text NOT NULL DEFAULT '' CHECK (length(description) <= 1000),
  cover_url text,
  prompt text NOT NULL CHECK (length(btrim(prompt)) BETWEEN 1 AND 6000),
  active boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 100000),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.maro_mood_saves (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood_id uuid NOT NULL REFERENCES public.maro_moods(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, mood_id)
);
CREATE INDEX maro_mood_saves_mood_idx ON public.maro_mood_saves(mood_id);
ALTER TABLE public.maro_moods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maro_mood_saves ENABLE ROW LEVEL SECURITY;
-- API routes own auth + beta eligibility. No direct client read or write path, including hidden instructions.
REVOKE ALL ON public.maro_moods, public.maro_mood_saves FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maro_moods, public.maro_mood_saves TO service_role;

INSERT INTO public.maro_moods (id,title,description,cover_url,prompt,active,sort_order) VALUES
('c7130000-0000-4000-8000-000000000001','Halloween Mood','Kunguj, mjegull dhe atmosferë misterioze rreth idesë tënde.','/images/moods/halloween.svg','Make the theme look like Halloween. Add tasteful pumpkins, subtle cobwebs, autumn leaves and atmospheric orange and violet lighting around the existing scene. Adapt the scenery completely to a polished Halloween campaign while keeping the user''s original creative idea. Do not change the product or its label; place seasonal elements around it and keep the product clearly visible.',true,0),
('c7130000-0000-4000-8000-000000000002','28 Nëntori Mood','Kuq e zi, krenari dhe atmosferë festive shqiptare.','/images/moods/28-nentori.svg','Adapt the complete existing concept to Albanian Independence Day on November 28. Use elegant red and black scenery, festive red fabric, subtle Albanian flag motifs and a dignified celebratory atmosphere. Keep the user''s original idea and present the product as the hero. Preserve the product, packaging, original colors, branding and label text exactly. Add national celebration elements only to the surrounding scene; do not repaint the product or add flag graphics to its label.',true,1);
