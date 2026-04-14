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
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/gotly_dev
REDIS_URL=redis://localhost:6382
AUTH_SECRET=your-auth-secret-here
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

## Directory Structure

```
app/                    # Next.js App Router routes, layouts, pages
  workspace/            # Workspace routes (启动台, 笔记, 待办, 书签, 知识库)
  auth/                # Authentication routes
components/             # Reusable React components
  workspace/           # Workspace-specific components
  ui/                  # shadcn/ui components
lib/                    # Lightweight shared helpers (cn, etc.)
server/                 # Server-only business logic
  assets/              # Asset CRUD, search, summarization
  auth/                # Authentication
  db/                  # Database connection and schema
  actions/             # Server actions
shared/                 # Cross-runtime types, schemas, constants
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

Documentation in this project follows **code as source of truth**. When code and docs conflict, code wins. PRD documents are periodically synchronized to reflect implemented behavior.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Database:** PostgreSQL 16 + Drizzle ORM
- **Cache:** Redis 7
- **AI:** Vercel AI SDK + AI Gateway
- **Auth:** Better Auth
