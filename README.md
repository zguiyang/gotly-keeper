<div align="center">

# Gotly Keeper

**Quietly keeping what matters**

AI-powered personal capture & retrieval workspace — collect ideas, save bookmarks,
manage todos, and find everything again with natural language.

<p>
  <a href="#features">Features</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#deployment">Deployment</a> ·
  <a href="#tech-stack">Tech Stack</a> ·
  <a href="#contributing">Contributing</a>
</p>

<p>
  <a href="./README.md">English</a> ·
  <a href="./README.zh.md">中文</a>
</p>

</div>

---

## What is Gotly Keeper?

Gotly Keeper is a **personal knowledge curator** — a lightweight workspace where you
capture ideas, save bookmarks, manage todos, and retrieve everything later simply by
asking. It bridges the gap between "I'll remember this" and "where did I put it?"

Instead of forcing you into folders and taxonomies up front, Gotly Keeper accepts
whatever you throw at it — a sentence, a link, a reminder — and uses AI to
classify, organize, and make it searchable. The structure happens in the background,
not on your screen.

### Core Philosophy

| Principle | Meaning |
|-----------|---------|
| **Capture first, organize later** | One input for everything — notes, links, todos. The AI figures out what it is. |
| **Retrieve by asking, not browsing** | Search with natural language — semantic understanding, not keyword matching. |
| **Background structure** | Time parsing, content summarization, URL metadata — all happen asynchronously. |
| **Quietly reliable** | PWA, works offline, dockerized deployment, no noisy notifications. |

---

## Features

### 🎯 Unified Capture

A single input field handles everything:
- **Notes** — `"记一下：product review 的几点反馈"`
- **Todos** — `"记个待办：下周三交周报"`
- **Bookmarks** — `"把这个链接存一下 https://example.com"`

The AI classifies intent, extracts time expressions, and creates the right asset type
— no dropdowns, no forms, no friction.

### 🔍 Semantic Retrieval

Stop guessing which folder you put something in. Search across all your assets with
natural language:

> *"我上次收藏的那篇关于 RAG 的文章在哪？"*
> *"show me todos from last week"*

Powered by pgvector embeddings and a multi-stage ranking pipeline.

### 📋 Smart Summaries

Ask the AI to summarize what you've collected:
- *"Summarize my notes from this week"*
- *"Review unfinished todos"*
- *"What bookmarks do I have about AI tools?"*

### ⏰ Time-Aware Todos

Write todos naturally — *"明天下午3点发邮件"* — and the AI extracts the due date.
Overdue, today, and upcoming views keep you on track without a calendar app.

### 🔖 Auto Metadata for Bookmarks

Save a URL and the background worker automatically fetches the page title,
description, and preview image — no manual filling.

### 📎 Lifecycle Management

Every asset (note, bookmark, todo) has a clean lifecycle:
**Active → Archive → Trash → Purge**

Move things out of sight without deleting, or permanently remove them when you're done.

### 📱 PWA Ready

Install as a standalone app on mobile or desktop. Works offline with service worker
caching. Full-screen, no browser chrome.

---

## Quick Start

### Prerequisites

- **Node.js** 22.x
- **pnpm** 10+
- **Docker** (for local PostgreSQL + Redis)

### 1. Start local infrastructure

```bash
docker compose up -d
```

This starts:
| Service | Version | Port |
|---------|---------|------|
| PostgreSQL (pgvector) | 16 | `5434` |
| Redis | 7 | `6382` |

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your settings. At minimum you'll need:

| Variable | Description |
|----------|-------------|
| `BETTER_AUTH_SECRET` | At least 32 random characters |
| `AI_GATEWAY_API_KEY` | Your AI gateway/LLM API key |
| `AI_GATEWAY_URL` | AI gateway endpoint |
| `AI_MODEL_NAME` | LLM model (e.g. `qwen3-max`) |
| `AI_EMBEDDING_MODEL_NAME` | Embedding model |
| `AI_EMBEDDING_DIMENSIONS` | Embedding vector dimensions |

See `.env.example` for the full list.

### 3. Install & initialize

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
```

### 4. Start development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                     User                             │
└──────────┬──────────────────────────┬───────────────┘
           │                          │
     ┌─────▼──────────┐    ┌──────────▼──────────┐
     │   Next.js App    │    │   Background Worker │
     │   (Web Server)   │    │ (URL Metadata Fetch)│
     │   Port 3000      │    │                     │
     └─────┬──────────┘    └──────────┬──────────┘
           │                          │
     ┌─────▼──────────────────────────▼──────────┐
     │           PostgreSQL 16 (pgvector)         │
     │     Notes · Bookmarks · Todos · Embeds     │
     └──────────────────┬─────────────────────────┘
                        │
     ┌──────────────────▼─────────────────────────┐
     │               Redis 7                       │
     │      Cache · Queue · Session Store          │
     └─────────────────────────────────────────────┘
```

### Stack Details

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **Database** | PostgreSQL 16 + pgvector |
| **ORM** | Drizzle ORM |
| **Cache & Queue** | Redis 7 + ioredis |
| **AI SDK** | Vercel AI SDK (`@ai-sdk/openai-compatible`) |
| **Auth** | Better Auth (email/password + GitHub OAuth) |
| **UI** | Tailwind CSS v4 + shadcn/ui + Base UI |
| **Animation** | Motion (framer-motion) |
| **Forms** | TanStack Form |
| **Icons** | Lucide |
| **Testing** | Vitest + Testing Library |
| **PWA** | Next.js PWA manifest + service worker |

### Key Modules

- **`server/modules/workspace-agent/`** — AI orchestration: classifies intent, plans
  actions, executes tool calls, returns structured results
- **`server/services/search/`** — Multi-stage search: semantic (pgvector cosine
  distance), keyword (trigram), ranking fusion
- **`server/services/queue/`** — Redis-backed background job queue for async tasks
- **`server/prompts/`** — System & user prompts for all AI pipeline stages
- **`server/services/bookmarks|notes|todos/`** — CRUD + lifecycle for each asset type
- **`components/workspace/`** — Workspace UI: unified input, run timeline, asset panels
- **`scripts/run-workers.ts`** — Background worker entry point (esbuild-bundled)

---

## Deployment

### Production Deploy (deploy.sh)

The project includes a deployment script (`deploy.sh`) that:

1. **Builds** two Docker images (`gotly-keeper-web`, `gotly-keeper-worker`) for
   `linux/amd64` using multi-stage Docker builds
2. **Pushes** them to a private registry
3. **Syncs** configuration to the remote server via SSH + SCP
4. **Runs** database migrations (Drizzle Kit)
5. **Pulls & restarts** containers on the remote server

```bash
# Full deploy (build + migrate + start)
./deploy.sh
```

The script offers 4 modes:

| Option | Action |
|--------|--------|
| `1` | Build + Migrate + Start (full deploy) |
| `2` | Build + Start (skip migration) |
| `3` | Start only (skip build & migration) |
| `4` | Migrate only |

### Docker Compose

- **`docker-compose.yml`** — Local development (PostgreSQL + Redis)
- **`docker-compose.prod.yml`** — Production (PostgreSQL + Web + Worker, uses
  external 1panel network)

### Environment Variables

Production requires a `.env.production` file — see `.env.example` for the schema.

---

## Scripts Reference

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Apply Drizzle migrations |
| `pnpm db:studio` | Open Drizzle Studio (browser DB explorer) |
| `pnpm db:check` | Check schema against migrations |
| `pnpm worker:start` | Build & start the URL metadata worker |
| `pnpm test` | Run all tests |
| `pnpm test:unit` | Run unit tests |
| `pnpm test:integration` | Run integration tests |
| `pnpm verify` | Typecheck + unit tests |

---

## Project Structure

```
├── app/                      # Next.js App Router routes
│   ├── api/                  # API routes (auth, workspace)
│   ├── auth/                 # Auth pages (sign-in, sign-up, reset-password)
│   └── workspace/            # Workspace pages (notes, todos, bookmarks, all)
│
├── server/                   # Server-side logic
│   ├── lib/                  # Infrastructure (db, cache, ai, config)
│   ├── modules/              # Server entrypoints (auth, workspace, workspace-agent)
│   ├── services/             # Domain services (notes, todos, bookmarks, search)
│   ├── prompts/              # AI system/user prompts
│   └── workers/              # Background workers
│
├── components/               # Reusable UI components
│   ├── ui/                   # Base UI primitives (shadcn/ui)
│   ├── workspace/            # Workspace-specific components
│   └── auth/                 # Auth form components
│
├── shared/                   # Cross-runtime types, schemas, helpers
├── hooks/                    # Client-side React hooks
├── config/                   # UI and app configuration
├── tests/                    # Unit & integration tests
├── drizzle/                  # Database migrations
└── scripts/                  # Build & maintenance scripts
```

---

## Contributing

1. Read `.ai-rules/` for repository governance and coding standards
2. Run `pnpm verify` before committing (typecheck + unit tests)
3. Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)
   (enforced by commitlint + husky)
4. Pre-commit hooks run linters and governance checks

---

## License

This project is open source. See the LICENSE file for details.

---

<p align="center">
  <em>Quietly keeping what matters.</em>
</p>
