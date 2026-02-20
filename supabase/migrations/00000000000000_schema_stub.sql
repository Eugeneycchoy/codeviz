-- CodeViz schema stub. Tables described in SPEC.md; run when Supabase is connected.
-- Do NOT run this migration until DB client and env are configured.

-- users: Supabase auth UID, email, name, avatar_url, created_at
-- CREATE TABLE public.users (
--   id uuid PRIMARY KEY,
--   email text,
--   name text,
--   avatar_url text,
--   created_at timestamptz
-- );

-- repositories: user_id FK -> users, name, source_type enum('upload','git_url'), source_url, file_count, last_viewed_at, created_at
-- CREATE TABLE public.repositories (
--   id uuid PRIMARY KEY,
--   user_id uuid REFERENCES public.users(id),
--   name text,
--   source_type text,
--   source_url text,
--   file_count int,
--   last_viewed_at timestamptz,
--   created_at timestamptz
-- );

-- repo_files: repo_id FK -> repositories, path, content, language
-- CREATE TABLE public.repo_files (
--   id uuid PRIMARY KEY,
--   repo_id uuid REFERENCES public.repositories(id),
--   path text,
--   content text,
--   language text
-- );

-- graph_edges: repo_id FK -> repositories, source_file_id FK -> repo_files, target_file_id FK -> repo_files
-- CREATE TABLE public.graph_edges (
--   id uuid PRIMARY KEY,
--   repo_id uuid REFERENCES public.repositories(id),
--   source_file_id uuid REFERENCES public.repo_files(id),
--   target_file_id uuid REFERENCES public.repo_files(id)
-- );

-- explanations: file_id FK -> repo_files UNIQUE, content (markdown), created_at
-- CREATE TABLE public.explanations (
--   id uuid PRIMARY KEY,
--   file_id uuid REFERENCES public.repo_files(id) UNIQUE,
--   content text,
--   created_at timestamptz
-- );
