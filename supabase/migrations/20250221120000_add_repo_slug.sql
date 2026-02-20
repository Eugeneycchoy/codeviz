-- Add slug to repositories: human-readable URL segment (e.g. portfolio-site) unique per user.
-- Normalize from name: lowercase, non-alphanumeric -> single hyphen, trim.

-- 1. Add nullable column
ALTER TABLE public.repositories ADD COLUMN slug text;

-- 2. Backfill from name (same normalization as app: lowercase, replace non-alphanumeric with -, trim)
-- Duplicates per user get -2, -3, etc. via row_number.
WITH normalized AS (
  SELECT
    id,
    user_id,
    name,
    LOWER(REGEXP_REPLACE(TRIM(REGEXP_REPLACE(COALESCE(name, ''), '[^a-zA-Z0-9]+', '-', 'g')), '^-+|-+$', '', 'g')) AS base_slug
  FROM public.repositories
),
with_fallback AS (
  SELECT id, user_id, base_slug,
    CASE WHEN LENGTH(TRIM(base_slug)) = 0 THEN 'repo' ELSE TRIM(base_slug) END AS slug_value
  FROM normalized
),
with_rank AS (
  SELECT with_fallback.id, with_fallback.slug_value,
    ROW_NUMBER() OVER (PARTITION BY with_fallback.user_id, with_fallback.slug_value ORDER BY r.created_at) AS rn
  FROM with_fallback
  JOIN public.repositories r ON r.id = with_fallback.id
)
UPDATE public.repositories r
SET slug = CASE
  WHEN with_rank.rn = 1 THEN with_rank.slug_value
  ELSE with_rank.slug_value || '-' || with_rank.rn
END
FROM with_rank
WHERE r.id = with_rank.id;

-- 3. Ensure any remaining nulls (e.g. empty name) get a value
UPDATE public.repositories
SET slug = 'repo-' || SUBSTRING(id::text, 1, 8)
WHERE slug IS NULL OR slug = '';

-- 4. Enforce NOT NULL and unique per user
ALTER TABLE public.repositories ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX repositories_user_id_slug_key ON public.repositories (user_id, slug);
