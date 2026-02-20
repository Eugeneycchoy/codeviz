This file provides guidance to AI coding agents like Claude Code (claude.ai/code), Cursor AI, Codex, Gemini CLI, GitHub Copilot, and other AI coding assistants when working with code in this repository.

---

We're building the app described in @SPEC.md. Read that file for general architectural tasks or to double check the exact database structure, tech stack or application architecture.

Keep your replies extremely concise and focus on conveying the key information. No unnecessary fluff, no long code snippets.

Whenever working with any third-party library or something similar, you MUST look up the official documentation to ensure that you're working with up-to-date information. Use the DocsExplorer subagent for efficient documentation lookup.

---

## Commands

| Task | Command |
|------|--------|
| Dev server | `npm run dev` |
| Production build | `npm run build` |
| Start production | `npm start` |
| Lint | `npm run lint` |

No test runner is configured yet (`package.json` has no `test` script). When tests are added, document the run command here.

---

## Architecture (big picture)

- **Framework:** Next.js 14 App Router. Routes live under `app/`: `page.tsx` (landing), `(auth)/login/page.tsx`, `dashboard/page.tsx`, `repo/[repoId]/page.tsx`. API routes under `app/api/` (auth, repo ingest/graph/delete, explain).
- **Auth & data:** NextAuth.js v5 for OAuth; Supabase (Postgres + storage). Session and Supabase clients are in `lib/auth.ts` and `lib/supabase.ts`. Use these instead of ad-hoc clients.
- **Middleware:** `middleware.ts` matches `/dashboard/*` and `/repo/*`; currently passthrough only (auth checks not yet wired).
- **Shared UI:** Root layout in `app/layout.tsx` wraps all pages with global Navbar and body styles. Reusable UI lives in `components/` (Navbar, RepoDropzone, DependencyGraph, FileNode, ExplanationPanel). Use `@/*` path alias (maps to repo root).
- **Graph:** React Flow v11 (`reactflow`), not `@xyflow/react`. Graph data comes from `GET /api/repo/[repoId]/graph`; node/edge shapes are defined in SPEC.md. Layout uses `dagre`.
- **Figma reference:** `figma-output/` is Vite/React Router output from Figma Make. It is excluded from TypeScript (`tsconfig.json` "exclude"). When integrating UI from Figma, adapt into the existing App Router pages and components; do not rely on `figma-output` at runtime.

---

## SPEC-driven rules

- **API contracts:** Follow the method, route, auth, and request/response shapes in SPEC.md (§6). Stub routes may return placeholder JSON until implemented.
- **Data models:** Match table and column names from SPEC.md (§5) when touching Supabase or types. RLS and per-user isolation are required.
- **Page/component map:** SPEC.md (§7) lists which files own which features. Prefer changing those files over adding new top-level modules unless the spec is updated.

---

## Conventions

- TypeScript strict; avoid `any` unless justified in a comment.
- Use `"use client"` only where needed (hooks, event handlers, browser APIs). Prefer server components by default.
- Styling: Tailwind CSS. Existing pages use utility classes and the same palette (e.g. `bg-[#fafafa]`, `text-[#1a1a1a]`).
- Do not commit secrets; env vars are listed in SPEC.md (§9). Do not add new dependencies without checking compatibility with Next 14 and the current stack.
