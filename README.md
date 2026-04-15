# Gotly AI

> Personal Curator — AI-powered personal knowledge management workspace

## Project Scope

Gotly AI is a personal knowledge curation tool that helps you capture, organize, and retrieve notes, todos, and bookmarks through natural language input. The AI interprets your intent and takes appropriate action (create, search, or summarize).

**Current implemented capabilities:**
- Unified natural language capture input
- Automatic intent detection (create note/link/todo, search, summarize)
- Semantic search across all assets
- Todo completion toggle
- Summarize unfinished todos, recent notes, or recent bookmarks
- Workspace views with filtered lists

**Out of current scope:**
- Multi-user collaboration
- Browser extension
- Push/desktop notifications
- Cross-app automation

## Prerequisites

- Node.js 18+
- pnpm 8+
- Docker (for local PostgreSQL and Redis)

## Setup and Environment

### 1. Start local infrastructure

```bash
docker compose up -d
```

Local services:
- PostgreSQL 16 (pgvector): `localhost:5434`
- Redis 7: `localhost:6382`

### 2. Configure environment

Create `.env.local` with required variables:

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5434
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DATABASE=gotly_dev
REDIS_HOST=localhost
REDIS_PORT=6382
REDIS_DB=0
REDIS_USERNAME=
REDIS_PASSWORD=
BETTER_AUTH_SECRET=replace-with-at-least-32-characters
BETTER_AUTH_URL=http://localhost:3000
AI_GATEWAY_API_KEY=xxx
AI_GATEWAY_URL=http://localhost:8000
AI_MODEL_NAME=qwen3-max
AI_EMBEDDING_MODEL_NAME=text-embedding-v4
AI_EMBEDDING_DIMENSIONS=1024
```

### 3. Install dependencies

```bash
pnpm install
```

### 4. Initialize database

```bash
pnpm db:generate
pnpm db:migrate
```

### 5. Start development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Run Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm db:generate` | Generate Drizzle schema types |
| `pnpm db:migrate` | Apply database migrations |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm db:check` | Check DB schema against migrations |
| `pnpm assets:backfill-embeddings` | Backfill vector embeddings for assets |
| `pnpm test` | Run all tests |
| `pnpm test:unit` | Run unit tests |
| `pnpm test:integration` | Run integration tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage |

## Directory Structure

```
app/                    # Next.js App Router routes and route entry files
client/                 # Client-side action adapters and feedback helpers
components/             # Reusable UI components
config/                 # Frontend UI configuration
hooks/                  # Client-side interaction and orchestration hooks
lib/                    # Lightweight shared helpers
server/                 # Server-side business logic and infrastructure
  application/          # Use-case orchestration layer
  actions/              # Action-layer helpers and tests
  <domain>/             # Domain services by business area
  config/               # Server-side constants and config
  db/                   # Database access and schema wiring
  test-utils/           # Shared server test support
shared/                 # Cross-runtime shared types, schemas, constants, helpers
scripts/                # Project runtime, maintenance, and test scripts
tests/                  # Centralized unit/integration/e2e tests
.ai-rules/              # Repository governance and implementation rules for AI
```

## Workspace Routes

| Route | Label | Description |
|-------|-------|-------------|
| `/workspace` | 启动台 | Main entry with recent assets and unified input |
| `/workspace/notes` | 笔记 | All captured notes |
| `/workspace/todos` | 待办 | All todos with completion toggle |
| `/workspace/bookmarks` | 书签 | All saved links/bookmarks |
| `/workspace/all` | 知识库 | Complete asset list across all types |

## Documentation Policy

Documentation in this project follows **code as source of truth**. When code and docs conflict, code wins.

Repository rules live in `.ai-rules/`.

Local planning material may exist in ignored local workspaces such as `docs/` and `prd/`, but those locations are not repository source-of-truth documents.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Database:** PostgreSQL 16 + Drizzle ORM
- **Cache:** Redis 7
- **AI:** Vercel AI SDK + AI Gateway
- **Auth:** Better Auth
