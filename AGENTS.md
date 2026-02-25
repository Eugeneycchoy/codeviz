## Cursor Cloud specific instructions

### Overview

CodeViz is a single Next.js 14 monolith (App Router, TypeScript, Tailwind CSS). There are no microservices, Docker containers, or local databases to run — just one dev server. See `AGENT.md` for full architecture and project layout; see `SPEC.md` for data models and API contracts.

### Commands

Standard scripts are in `package.json` and documented in `AGENT.md`:

| Action | Command |
|--------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` (port 3000) |
| Lint | `npm run lint` |
| Build | `npm run build` |

No test runner is configured (no Jest, Vitest, or Playwright).

### Known issues

- **`npm run build` fails** with a type error: `declare module "next-auth/jwt"` augmentation is not resolved under `moduleResolution: "bundler"` with `next-auth@5.0.0-beta.30`. This is a pre-existing issue. `npm run dev` works fine (no strict type checking at dev time).

### Environment variables

Copy `.env.example` to `.env`. For local dev without external services, only `NEXTAUTH_SECRET` and `NEXTAUTH_URL=http://localhost:3000` are needed to start the dev server. All Supabase and OAuth vars are required for functional login and data persistence — without them the app renders but auth-gated routes redirect to `/login`.

### External service dependencies

All external (Supabase, GitHub/Google OAuth, Poe API, OpenAI API). No local services to start. The app degrades gracefully: landing page and login page render without any credentials; Supabase clients become `null` when env vars are missing.
