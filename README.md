<div align="center">

# Gotly Keeper

Notes, bookmarks, and todos. One input. Zero organizing.

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
  <img src="https://img.shields.io/badge/version-0.1.4-0051b1?style=flat" alt="Version">
  <a href="https://github.com/zguiyang/gotly-keeper/stargazers">
    <img src="https://img.shields.io/github/stars/zguiyang/gotly-keeper?style=flat&label=Stars&color=yellow" alt="Stars">
  </a>
  <a href="https://github.com/zguiyang/gotly-keeper/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/zguiyang/gotly-keeper?style=flat&label=License&color=green" alt="License">
  </a>
  <img src="https://img.shields.io/badge/PRs-welcome-0051b1?style=flat" alt="PRs Welcome">
  <img src="https://img.shields.io/badge/Made%20with-TypeScript-3178c6?style=flat&logo=typescript" alt="TypeScript">
</p>

</div>

---

<details open>
<summary><b>📑 Table of Contents</b></summary>

- [Demo](#demo)
- [Why I built this](#-why-i-built-this)
- [How It Works](#how-it-works)
- [Why not just use Notion / Obsidian?](#-why-not-just-use-notion--obsidian)
- [Features](#features)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Deployment](#deployment)
- [Let's talk](#-lets-talk)
- [Contributing](#contributing)

</details>

---

## Demo

<img src="https://cloud.zgyk.cc/f/xEt0/example2.webp" alt="Gotly Keeper Demo" width="100%" style="max-width:100%;border-radius:10px;border:1px solid rgba(0,0,0,0.1)">

[▶ Watch full demo video](https://cloud.zgyk.cc/f/OJfb/example.mp4)

---

## 💡 Why I built this

I'm a developer who collects a lot of stuff — links from Twitter, ideas at 2am,
stuff people send me, random todos. Over time this became:

- 📌 **Saved it. Can't find it.** Bookmarks in Chrome. Notes in Apple Notes.
  Todos in TickTick. Nothing talks to anything.
- 📝 **Jotted it down. Never looked again.** Random snippets pile up.
  Organizing feels like a second job.
- ⏳ **Organized it. Took longer than writing it.** Tags, folders, categories —
  I spent more time filing than finding.

I wanted **one place**. Type anything. AI figures out what it is. Ask naturally
to find it. No folders, no tags. So I built it.

**Gotly Keeper is the tool I wished existed.**

---

## How It Works

One input box. Whatever you type — a note, a bookmark, a todo — the AI
classifies it, extracts time if any, and stores it. Later, just ask in natural
language. Semantic search finds what you need, even if you don't remember
where you put it.

> *"Keep this: the Q3 pricing proposal feedback"* → **Note**
>
> *"Save this: https://example.com/ai-paper"* → **Bookmark**
>
> *"Remind me: send the report by Friday 3pm"* → **Todo with due date**
>
> *"Where's that article about RAG I saved last month?"* → **Found instantly**

---

## 🆚 Why not just use Notion / Obsidian?

I tried them all. Notion is great for writing docs. Obsidian is great for connecting ideas. But neither is built for the **micro-moments** — the thought too small
for a note, too important to forget.

| My daily micro-moments | Notion | Obsidian | Apple Notes | Gotly Keeper |
|---|---|---|---|---|
| Save a link in 2 seconds | Too heavy | No | ✅ | ✅ |
| "Remind me to call Mom Friday 3pm" | Manual setup | Nope | Nope | ✅ |
| "Where's that article about RAG?" | Search folders | File names | Scroll | ✅ Ask naturally |
| Dump a random idea at midnight | App is heavy | App is heavy | ✅ | ✅ |
| One input for everything | 3 different blocks | 1 file | 1 note | ✅ AI sorts it |
| Runs on my server | ❌ | ✅ | ❌ | ✅ |
| Open source | ❌ | ❌ | ❌ | ✅ |

> **Gotly Keeper doesn't replace your notes app. It catches what never makes it into one.**

---

## ⚠️ A work in progress

Gotly Keeper is still early. The AI isn't as smart as I want it to be
yet. A lot of ideas are still on the list, not in the product.

If something feels rough, it probably is. I'm on it.

Feedback and constructive rants are always welcome. If it's not your thing,
feel free to skip — no hard feelings.

---

## Features

Here's what it does today:

### Unified Capture

A single input field for everything:
- Notes, bookmarks, todos — the AI figures out which is which
- Time expressions are parsed automatically ("next Wednesday 3pm")
- No dropdowns, no forms.

### Semantic Search

Stop guessing which folder you put something in. Ask in natural language:

> *"Show me todos from last week"*
> *"What bookmarks do I have about AI tools?"*
> *"Summarize my notes from this month"*

Powered by pgvector embeddings and a multi-stage ranking pipeline.

### Smart Summaries

Let the AI summarize what you've collected:
- *"Summarize my notes from this week"*
- *"What have I been collecting about AI tools?"*

### Auto Bookmark Metadata

Save a URL → the background worker automatically fetches the page title,
description, and preview image. No manual filling.

### Lifecycle Management

Every asset follows: **Active → Archive → Trash → Purge**

Move things out of sight without deleting. Or permanently remove them.

### PWA Ready

Install as a standalone app on mobile or desktop. Full-screen,
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
  distance), keyword (substring matching), ranking fusion
- **`server/services/queue/`** — Redis-backed background job queue
- **`server/prompts/`** — System & user prompts for all AI pipeline stages
- **`server/services/bookmarks|notes|todos/`** — CRUD + lifecycle for each asset
- **`components/workspace/`** — Workspace UI: unified input, timeline, panels
- **`scripts/run-workers.ts`** — Background worker entry point

---

## Deployment

### Docker Deployment

The project ships with one shared multi-stage `Dockerfile` and builds two runtime targets from the same source tree:

| Stage | Purpose |
|-------|---------|
| `web-runner` | Next.js production server (port 3000) |
| `worker-runner` | Background worker (URL metadata fetch) |

#### Prerequisites

- Docker Engine 24+ with Docker Compose v2
- PostgreSQL 16+ with the `vector` extension enabled
- Redis 7+
- A public application URL for auth callbacks and session cookies

For production, prefer:

- a dedicated PostgreSQL database for this app
- a dedicated Redis instance, or at minimum a unique `REDIS_KEY_PREFIX` when Redis is shared across apps

#### Required environment variables

Create `.env.production` from `.env.example` and fill in your production values.

The same variables must be available at build time and runtime. This project reads server environment during `next build`, so missing build-time variables can break the image build.

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Example: `postgres://user:password@db-host:5432/gotly_keeper` |
| `REDIS_URL` | Yes | Example: `redis://:password@redis-host:6379/0` or `rediss://...` |
| `REDIS_KEY_PREFIX` | Recommended when Redis is shared | Example: `gotly-keeper` |
| `BETTER_AUTH_SECRET` | Yes | Minimum 32 characters |
| `BETTER_AUTH_URL` | Yes | Public base URL, e.g. `https://app.example.com` |
| `AI_GATEWAY_API_KEY` | Usually yes | Depends on your AI gateway setup |
| `AI_GATEWAY_URL` | Usually yes | AI gateway base URL |
| `AI_MODEL_NAME` | Usually yes | Main generation model |
| `AI_EMBEDDING_MODEL_NAME` | Usually yes | Embedding model |
| `AI_EMBEDDING_DIMENSIONS` | Usually yes | Must match your embedding model |
| `RESEND_KEY` | No | Required only if email features are enabled |
| `GITHUB_CLIENT_ID` | No | Required only for GitHub OAuth |
| `GITHUB_CLIENT_SECRET` | No | Required only for GitHub OAuth |

#### Build strategy

The default Docker flow uses a BuildKit secret so your env file is not copied into the image:

```bash
docker build --target web-runner --secret id=app_env,src=.env.production -t gotly-keeper-web:latest .
docker build --target worker-runner --secret id=app_env,src=.env.production -t gotly-keeper-worker:latest .
```

The `Dockerfile` also accepts build-time variables through Docker build args, which is useful for source-based deployment platforms. They are only exported for the build step and are not kept as final runtime `ENV` instructions in the image.

#### Generic source-based deployment with Docker Compose

The included `docker-compose.prod.yml` builds both services directly from the repository and assumes PostgreSQL and Redis are provided externally.

1. Create the production env file:

```bash
cp .env.example .env.production
```

2. Edit `.env.production` so it points at your production PostgreSQL and Redis.

3. Build both images from source:

```bash
docker compose -f docker-compose.prod.yml build
```

4. Run database migrations before the first rollout and before releases that add new migrations:

```bash
docker compose -f docker-compose.prod.yml run --rm worker ./node_modules/.bin/drizzle-kit migrate
```

5. Start the app services:

```bash
docker compose -f docker-compose.prod.yml up -d
```

6. Inspect logs when needed:

```bash
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs -f worker
```

#### Local infrastructure-only compose

For local development only, `docker-compose.yml` still starts PostgreSQL and Redis on your machine:

```bash
docker compose up -d postgres redis
```

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

## 💬 Let's talk

I'm building this solo. Feedback, bug reports, and
feature ideas are all welcome — I read everything.

- 🐛 **[Issues](https://github.com/zguiyang/gotly-keeper/issues)** — bugs, ideas, feature requests
- ⭐ **Star the repo** if you find it useful — it helps

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
  <b>Say it once. Find it anytime.</b><br>
  <sub>Open source · Self-hosted · Your data, your rules.</sub><br><br>
  <a href="https://github.com/zguiyang/gotly-keeper">⭐ Star on GitHub</a>
</p>
