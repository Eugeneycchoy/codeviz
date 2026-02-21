-- T2: AI analysis result columns for repositories.
ALTER TABLE public.repositories
  ADD COLUMN IF NOT EXISTS detected_stack_id text;
ALTER TABLE public.repositories
  ADD COLUMN IF NOT EXISTS analysis_extra_aliases jsonb DEFAULT '[]'::jsonb;
