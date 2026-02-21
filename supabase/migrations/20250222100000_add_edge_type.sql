-- Add optional edge_type to graph_edges for AI-classified connection path (Renders / Data flow / Utilities).
-- Null means use path-based inference at read time (backward compatible).
ALTER TABLE public.graph_edges
  ADD COLUMN IF NOT EXISTS edge_type text
  CHECK (edge_type IS NULL OR edge_type IN ('composition', 'data', 'utility'));
