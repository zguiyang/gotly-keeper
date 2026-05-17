<div align="center">

# Gotly Keeper

**Say it once. Find it anytime.**

AI-powered personal knowledge workspace — notes, bookmarks, and todos,
all in one place. No folders, no tags, no friction.

<p>
  <a href="#demo">Demo</a> ·
  <a href="#features">Features</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#deployment">Deployment</a> ·
  <a href="#tech-stack">Tech Stack</a>
</p>

<p>
  <a href="./README.md">English</a> ·
  <a href="./README.zh.md">中文</a>
</p>

<p>
  <a href="https://github.com/zguiyang/gotly-keeper/stargazers">
    <img src="https://img.shields.io/github/stars/zguiyang/gotly-keeper?style=flat&label=Stars" alt="Stars">
  </a>
  <a href="https://github.com/zguiyang/gotly-keeper/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/zguiyang/gotly-keeper?style=flat&label=License" alt="License">
  </a>
</p>

</div>

---

## Demo

<video src="https://cloud.zgyk.cc/f/Y3cO/demo.mp4" controls muted loop playsinline referrerpolicy="no-referrer" style="width:100%;border-radius:10px;border:1px solid rgba(0,0,0,0.1)"></video>

[Direct link to demo video](https://cloud.zgyk.cc/f/Y3cO/demo.mp4)

---

## The Problem

Your mind is full of things to remember. Ideas strike at odd moments. Links pile
up in chat history. Todos live in three different apps. And when you need
something — that article about RAG, the feedback from last week's meeting,
the link a colleague shared — you end up digging through folders, scrolling
chat history, and wondering where you put it.

**Gotly Keeper is the place you throw it all, and the place you find it all.**

---

## How It Works

One input box. Whatever you type — a note, a bookmark, a todo — the AI
classifies it, extracts time if any, and stores it. Later, just ask in natural
language. Semantic search finds what you need, even if you don't remember
how you filed it.

> *"Keep this: the Q3 pricing proposal feedback"* → **Note**
>
> *"Save this: https://example.com/ai-paper"* → **Bookmark**
>
> *"Remind me: send the report by Friday 3pm"* → **Todo with due date**
>
> *"Where's that article about RAG I saved last month?"* → **Found instantly**

---

## Features

### Unified Capture

A single input field for everything:
- Notes, bookmarks, todos — the AI figures out which is which
- Time expressions are parsed automatically ("next Wednesday 3pm")
- No dropdowns, no forms, no friction

### Semantic Search

Stop guessing which folder you put something in. Ask in natural language:

> *"Show me todos from last week"*
> *"What bookmarks do I have about AI tools?"*
> *"Summarize my notes from this month"*

Powered by pgvector embeddings and a multi-stage ranking pipeline.

### Smart Summaries

Let the AI summarize what you've collected:
- *"Summarize my notes from this week"*
- *"Review unfinished todos"*
- *"What have I been collecting about AI tools?"*

### Auto Bookmark Metadata

Save a URL → the background worker automatically fetches the page title,
description, and preview image. No manual filling.

### Lifecycle Management

Every asset follows: **Active → Archive → Trash → Purge**

Move things out of sight without deleting. Or permanently remove them.

### PWA Ready

Install as a standalone app on mobile or desktop. Works offline. Full-screen,
no browser chrome.

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

This starts PostgreSQL 16 (pgvector, port `5434`) and Redis 7 (port `6382`).

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your settings. At minimum:

| Variable | Description |
|----------|-------------|
| `BETTER_AUTH_SECRET` | At least 32 random characters |
| `AI_GATEWAY_API_KEY` | Your LLM API key |
| `AI_GATEWAY_URL` | AI gateway endpoint |
| `AI_MODEL_NAME` | LLM model (e.g. `qwen3-max`) |
| `AI_EMBEDDING_MODEL_NAME` | Embedding model |
| `AI_EMBEDDING_DIMENSIONS` | Embedding vector dimensions |

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

### Tech Stack

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
| **Testing** | Vitest + Testing Library |
| **PWA** | Next.js PWA manifest + service worker |

### Key Modules

- **`server/modules/workspace-agent/`** — AI orchestration: classifies intent,
  plans actions, executes tool calls, returns structured results
- **`server/services/search/`** — Multi-stage search: semantic (pgvector cosine
  distance), keyword (trigram), ranking fusion
- **`server/services/queue/`** — Redis-backed background job queue
- **`server/prompts/`** — System & user prompts for all AI pipeline stages
- **`server/services/bookmarks|notes|todos/`** — CRUD + lifecycle for each asset
- **`components/workspace/`** — Workspace UI: unified input, timeline, panels
- **`scripts/run-workers.ts`** — Background worker entry point

---

## Deployment

### Production Deploy (deploy.sh)

The project includes a deployment script (`deploy.sh`) that:

1. Builds two Docker images for `linux/amd64`
2. Pushes to a private registry
3. Syncs configuration via SSH + SCP
4. Runs database migrations
5. Pulls & restarts containers on the remote server

```bash
./deploy.sh
```

Offers 4 modes: full deploy, build + start, start only, or migrate only.

**Docker Compose files:**
- `docker-compose.yml` — Local dev (PostgreSQL + Redis)
- `docker-compose.prod.yml` — Production (PostgreSQL + Web + Worker)

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
│   ├── auth/                 # Auth pages
│   └── workspace/            # Workspace pages
│
├── server/                   # Server-side logic
│   ├── lib/                  # Infrastructure (db, cache, ai, config)
│   ├── modules/              # Server entrypoints
│   ├── services/             # Domain services
│   ├── prompts/              # AI system/user prompts
│   └── workers/              # Background workers
│
├── components/               # Reusable UI components
├── shared/                   # Cross-runtime types, schemas, helpers
├── hooks/                    # Client-side React hooks
├── config/                   # UI and app configuration
├── tests/                    # Unit & integration tests
├── drizzle/                  # Database migrations
└── scripts/                  # Build & maintenance scripts
```

---

## Contributing

1. Read `.ai-rules/` for repository governance
2. Run `pnpm verify` before committing (typecheck + unit tests)
3. Commits follow [Conventional Commits](https://www.conventionalcommits.org/)
4. Pre-commit hooks run linters and governance checks

---

## License

Open source. See [LICENSE](./LICENSE) for details.

---

<p align="center">
  <em>Quietly keeping what matters.</em>
</p>
