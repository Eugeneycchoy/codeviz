# Agent guidance for CodeViz

This file provides guidance to AI coding agents like Claude Code (claude.ai/code), Cursor AI, Codex, Gemini CLI, GitHub Copilot, and other AI coding assistants when working with code in this repository.

---

We're building the app described in **SPEC.md**. Read that file for general architectural tasks or to double check the exact database structure, tech stack or application architecture.

Keep your replies extremely concise and focus on conveying the key information. No unnecessary fluff, no long code snippets.

Whenever working with any third-party library or something similar, you **MUST** look up the official documentation to ensure that you're working with up-to-date information. Use the DocsExplorer subagent for efficient documentation lookup.

---

## Commands

| Action | Command |
|--------|--------|
| Install dependencies | `npm install` |
| Development server | `npm run dev` (then open http://localhost:3000) |
| Production build | `npm run build` |
| Production run | `npm run start` |
| Lint | `npm run lint` |

No test runner is configured in this repo (no Jest, Vitest, or Playwright in `package.json`). There is no script to run a single test or the full test suite.

---

## High-level architecture

- **Framework:** Next.js 14 App Router, TypeScript. Path alias `@/*` → project root.
- **Auth:** NextAuth.js v5. Session required for `/dashboard`, `/repo/*`, and `/api/repo/*`, `/api/explain`. Middleware in `middleware.ts` redirects unauthenticated users to `/login`.
- **Data:** Supabase (Postgres + optional storage). Use `supabaseBrowser` in client code and `supabaseAdmin` only on the server (see `lib/supabase.ts`). Never import `supabaseAdmin` in `"use client"` code.
- **Routes:** Repos are identified by **slug** in URLs (not raw `repoId`). Routes are `/repo/[slug]` and `/api/repo/[slug]` (and `/api/repo/[slug]/graph`). Ingest returns both `repoId` and `slug`; the app navigates by slug.
- **Ingest flow:** `POST /api/repo/ingest` accepts ZIP (multipart) or `{ gitUrl }` JSON. Uses `lib/repo-ingest.ts` (filtering, language detection, DB write), `lib/parser.ts` (regex import extraction), and `lib/codebase-analysis.ts` (AI classification). Persists `repositories` with `layer_config` and `detected_stack_id` (see below).
- **Graph flow:** `GET /api/repo/[slug]/graph` loads repo by slug, reads `repo_files` and `graph_edges`, classifies files using either stored `layer_config` (from codebase-analysis) or fallback heuristics in `lib/layers.ts` (five fixed layers: Interface, Services, Data, Shared, Platform). Returns nodes/edges for the frontend.
- **Explain flow:** `POST /api/explain` with `{ fileId }` returns cached or freshly generated explanation (Poe API). Explanations stored in `explanations` table keyed by `file_id`.
- **UI:** Graph is rendered by `components/ArchGraph.tsx` (custom layout with framer-motion), not React Flow or dagre (SPEC mentions those; current implementation uses a custom layer/module layout). `ArchDetailPanel` shows file details; `ExplanationPanel` shows AI explanation. Landing uses `RepoDropzone`; dashboard lists repos and links to `/repo/{slug}`.

**Implementation vs SPEC:** SPEC uses `repoId` in route descriptions; the codebase uses **slug** for all repo URLs and API paths. The `repositories` table includes `slug`, `layer_config` (AI file classification rules), and `detected_stack_id` in addition to the fields in SPEC.

---

## Project layout (where to look)

- **`app/`** — App Router pages and API routes. `app/page.tsx` = landing; `app/dashboard/page.tsx` = saved repos; `app/repo/[slug]/page.tsx` = graph view.
- **`app/api/`** — `auth/[...nextauth]`, `repo/ingest`, `repo/[slug]` (DELETE), `repo/[slug]/graph`, `repo` (GET list), `explain`.
- **`components/`** — `ArchGraph`, `ArchDetailPanel`, `ExplanationPanel`, `Navbar`, `RepoDropzone`, `SessionProviderWrapper`.
- **`lib/`** — `auth.ts` (NextAuth + user sync to Supabase), `supabase.ts`, `parser.ts` (import heuristics), `repo-ingest.ts` (filter + DB pipeline), `codebase-analysis.ts` (AI layer/module classification), `layers.ts` (fixed layers + path heuristics), `stack-profiles.ts`, `redirect.ts`.

---

## Environment and config

Copy `.env.example` to `.env` and fill in keys. Required for production (see `lib/auth.ts`): `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, GitHub and/or Google OAuth vars. Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. AI: `POE_API_KEY` (explanations), `OPENAI_API_KEY` (codebase analysis at ingest). See SPEC.md §9 and `.env.example`.

---

## Available skills and subagents

- **Context7 (MCP)** — Resolve library IDs and query up-to-date documentation and code examples for libraries/frameworks. **When to use:** Before implementing or changing anything that depends on a third-party library (e.g. Next.js, NextAuth, Supabase, React, Tailwind, isomorphic-git, JSZip). Prefer looking up official docs via Context7 (or DocsExplorer if available) instead of implementing from memory.

No project-local agent rules were found in `.cursor/rules/`, `.cursorrules`, `.github/copilot-instructions.md`, or `AGENTS.md`/`GEMINI.md`. If you add Cursor rules or Copilot instructions later, summarize the important, non-obvious parts here so future agents stay aligned.
