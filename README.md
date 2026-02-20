# CodeViz

**Understand complex codebases in minutes, not hours.**

CodeViz turns any repository into an interactive dependency graph. Every file is a node; every import is an edge. Click a node and get a clear, AI-generated explanation of what that file does—so you can onboard faster, refactor with confidence, or simply learn how a codebase fits together.

---

## Why CodeViz?

- **Visual first** — See the full dependency tree at a glance. No more grepping through imports or guessing relationships.
- **Explain on demand** — Click any file node to open a detailed explanation in plain language. Explanations are generated once and cached, so repeat views are instant.
- **Repo your way** — Drop a ZIP or paste a Git URL (GitHub, GitLab, Bitbucket). Language-agnostic parsing works across most codebases.
- **Your data, your dashboard** — Sign in with GitHub or Google. Save repos, track what you’ve viewed, and remove them when you’re done.

Built for developers jumping into unfamiliar code and learners exploring real-world projects.

---

## Features

- Drag-and-drop ZIP upload and remote Git URL ingestion
- File-level dependency graph with hierarchical layout (nodes = files, edges = import direction)
- On-click AI explanation panel with persistent cache
- OAuth (GitHub, Google) and a personal dashboard with saved repos and history
- Cascade delete for repos (files, edges, and explanations)

---

## Tech stack

Next.js 14 (App Router), TypeScript, Tailwind CSS, NextAuth.js, Supabase, React Flow, and an OpenAI-compatible API (Poe) for explanations. Designed to run on Vercel.

---

## Getting started

```bash
git clone <this-repo>
cd codeviz
npm install
cp .env.example .env   # then fill in your keys (see .env.example for required vars)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). For full architecture, API contracts, and data models, see **SPEC.md**.

---

## Contributing

Contributions are welcome. Open an issue or PR when the project is ready for external contributors.

## License

TBD.
