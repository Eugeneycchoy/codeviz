-- CodeViz schema stub. Tables described in SPEC.md; run when Supabase is connected.
-- Run this migration manually via the Supabase dashboard or CLI before testing auth end-to-end.

-- users: app user record synced from NextAuth (email, name, avatar). id is our PK, not Supabase Auth.
-- We do not add auth.uid() RLS policies here: we use NextAuth (not Supabase Auth). All writes to
-- public.users go through the service-role admin client, which bypasses RLS.
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- repositories: user_id FK -> users, name, source_type enum('upload','git_url'), source_url, file_count, last_viewed_at, created_at
CREATE TABLE public.repositories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('upload', 'git_url')),
  source_url text,
  file_count int NOT NULL DEFAULT 0,
  last_viewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;

-- repo_files: repo_id FK -> repositories, path, content, language
CREATE TABLE public.repo_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id uuid NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  path text NOT NULL,
  content text,
  language text
);

ALTER TABLE public.repo_files ENABLE ROW LEVEL SECURITY;

-- graph_edges: repo_id FK -> repositories, source_file_id FK -> repo_files, target_file_id FK -> repo_files
CREATE TABLE public.graph_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id uuid NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  source_file_id uuid NOT NULL REFERENCES public.repo_files(id) ON DELETE CASCADE,
  target_file_id uuid NOT NULL REFERENCES public.repo_files(id) ON DELETE CASCADE
);

ALTER TABLE public.graph_edges ENABLE ROW LEVEL SECURITY;

-- explanations: file_id FK -> repo_files UNIQUE, content (markdown), created_at
CREATE TABLE public.explanations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL UNIQUE REFERENCES public.repo_files(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.explanations ENABLE ROW LEVEL SECURITY;

-- Indexes for common lookups
CREATE INDEX ON public.repositories (user_id);
CREATE INDEX ON public.repo_files (repo_id);
CREATE INDEX ON public.graph_edges (repo_id);
CREATE INDEX ON public.graph_edges (source_file_id);
CREATE INDEX ON public.graph_edges (target_file_id);
