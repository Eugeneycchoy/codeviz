-- Add AI-determined layer configuration to repositories.
-- Nullable: existing rows remain NULL and continue using stack-profile fallback.
ALTER TABLE public.repositories
  ADD COLUMN IF NOT EXISTS layer_config jsonb;
