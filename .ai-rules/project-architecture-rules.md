# Project Architecture Rules

## 1. Purpose

This document defines the repository-specific architecture for this project.

It describes how the governance principles and universal boundary rules are applied in this codebase's actual directory structure and dependency flow.

Use this file when deciding where code belongs in this repository, how layers map to directories, and which repository-specific dependency boundaries are enforced.

This file does not restate general governance principles or framework knowledge that already lives in mother documents or skills.

## 2. Upstream Rules

Read these first:

- `.ai-rules/project-governance-rules.md`
- `.ai-rules/universal-development-boundary-rules.md`
- `.ai-rules/backend-architecture-principles.md`
- `.ai-rules/frontend-architecture-principles.md`

Use framework-specific skills and docs for framework behavior details.

When directory-level mapping in this file conflicts with behavior-boundary rules, follow:

1. `backend-architecture-principles.md` for server-side behavioral boundaries and dependency intent
2. `frontend-architecture-principles.md` for client-side behavioral boundaries and dependency intent
3. this file for repository-specific placement and implementation mapping

## 3. Repository Architecture Intent

This repository is implemented as an integrated full-stack application.

Architecture goals:

- keep route entry files thin
- keep business logic out of route and page files
- keep domain logic in server-owned modules
- keep true cross-runtime assets in `shared/`
- keep privileged infrastructure access on the server side
- grow structure only when complexity justifies it

## 4. Repository Directory Responsibilities

These are the architectural anchors for this repository.

### 4.1 `app/`

Owns route entry files and route-level composition.

Includes:

- `page.tsx`
- `layout.tsx`
- `loading.tsx`
- `error.tsx`
- `not-found.tsx`
- `api/**/route.ts`
- `**/actions.ts`

Rules:

- keep route entry files thin
- keep route files focused on composition, rendering, request/response handling, and boundary validation
- do not place substantial business logic directly in `app/`
- use route handlers only when a real HTTP boundary is needed

### 4.2 `components/`

Owns reusable UI components.

Rules:

- keep components focused on rendering and event binding
- avoid embedding orchestration or business rules
- do not define business constants here

See `.ai-rules/react-client-state-and-forms-rules.md` for detailed client-side component, hook, and form boundaries.

### 4.3 `client/`

Owns client-side adapters and feedback helpers.

Typical responsibilities:

- thin wrappers around server actions
- client-only feedback integration
- adapter-level client behavior that should not live in components

### 4.4 `hooks/`

Owns client-side interaction and orchestration hooks.

Rules:

- place stateful interaction logic here
- keep hooks focused on orchestration, transitions, and reusable interactive behavior
- do not render UI here

### 4.5 `config/`

Owns frontend UI configuration and presentation-level constants.

Examples:

- navigation config
- filters
- display configuration

### 4.6 `lib/`

Owns lightweight shared helpers.

Rules:

- keep `lib/` small and generic
- use it for low-level reusable helpers that are safe to share
- do not let it become a second business-logic layer

### 4.7 `server/`

Owns server-side business logic and infrastructure-facing code through three layers.

Rules:

- keep app-facing use-case entrypoints and orchestration in `server/modules/`
- keep reusable domain capabilities in `server/services/`
- keep infrastructure and technical integration in `server/lib/`
- keep third-party SDK/client instance creation and provider configuration in `server/lib/` only

#### 4.7.1 `server/modules/`

Owns app-facing module APIs consumed by `app/**`, including use-case orchestration.

Rules:

- keep module APIs explicit and boundary-owned
- own use-case orchestration and flow composition for module-facing business capabilities
- delegate reusable domain capabilities to `server/services/**`
- do not depend on `app/`
- may import from `server/lib/**` when the integration is boundary-owned by the module (for example auth/session or module-level AI execution policy)
- must not create or configure third-party SDK/provider/database/cache/auth clients; consume capabilities from `server/lib/**` instead
- module exports must be module-owned: only export values/types/functions declared inside the same module directory
- do not passthrough re-export from other modules or layers (`export ... from` pointing to outside this module directory), including services/lib/shared/app

#### 4.7.2 `server/services/`

Owns reusable domain services and capability units used by modules.

Rules:

- keep reusable domain semantics, data operations, and domain-specific capability composition here
- may depend on `server/lib/**`
- may depend on other `server/services/**` modules when direction stays domain-safe
- must not import `server/modules/**`
- must not create or configure third-party SDK/provider/database/cache/auth clients; consume capabilities from `server/lib/**` instead

#### 4.7.3 `server/lib/`

Owns technical infrastructure setup and integration details:
- `server/lib/db/**`
- `server/lib/cache/**`
- `server/lib/ai/**`
- `server/lib/auth/**`
- `server/lib/config/**`
- `server/lib/env.ts`

### 4.8 `shared/`

Owns cross-runtime assets intentionally shared by server and client.

Rules:

- place shared types, schemas, constants, and neutral helpers here
- do not push server-only business logic into `shared/`
- only use `shared/` when the asset is truly cross-boundary

## 5. Repository-Specific Dependency Rules

This repository enforces a unidirectional dependency flow:

```text
app/actions -> modules -> services -> lib
                      \---------> lib
```

This dependency diagram is the current repository mapping; behavior-boundary enforcement and architectural intent are governed by `.ai-rules/backend-architecture-principles.md`.

Rules:

- `app/**` may call `server/modules/**`
- `server/modules/**` may call `server/services/**`
- `server/modules/**` may call `server/lib/**` for module-owned boundary integrations
- `server/services/**` may call `server/lib/**`
- reverse dependencies are forbidden

Forbidden patterns:

- `server/**` importing `app/**`
- `server/services/**` importing `server/modules/**`
- `server/lib/**` importing `server/services/**` or `server/modules/**`

## 6. Repository Runtime and Entry Rules

These rules define how this repository uses its current framework runtime and entry surfaces.

### 6.1 Data Fetching

Rules:

1. Prefer direct server-side data access for rendering.
2. Do not make internal pages call their own internal API routes just to fetch app data.
3. If server-side data is needed for rendering, fetch it directly in the server-owned layer instead of round-tripping through HTTP.
4. As domain complexity grows, move data access and orchestration into `server/` rather than leaving it inside route entry files.

### 6.2 Route Handlers

For `app/api/**/route.ts`:

- use route handlers only when a real HTTP boundary is needed
- validate input
- authenticate and authorize when required
- return only safe response fields
- avoid leaking sensitive internal errors

Route handlers are not the default data layer for internal page rendering.

### 6.3 Server and Client Boundary

Rules:

1. Server-only logic must remain on the server.
2. Client-side modules must not import server-only modules, database access code, Redis clients, or other privileged helpers.
3. Sensitive logic stays in server-owned code paths.
4. Shape and trim data before passing it into client-owned modules.
5. Pass only the minimum safe props needed by client-side consumers.

If a module is intended for server-only use, protect it explicitly with `import 'server-only'`.

### 6.4 Server Actions and Module Use-Cases

Server actions in `app/**/actions.ts` remain thin entry points.

They may:

- validate input
- authenticate
- invoke action wrappers
- invalidate cache
- delegate orchestration to module use-cases

They must not:

- call deep domain capability units directly when a module use-case layer exists for that flow
- contain deep business branching
- import from `@/app`
- become the home for deep business logic

Use-cases in `server/modules/<domain>/`:

- own orchestration
- coordinate domain services and module-local flow units
- translate errors
- own cross-domain coordination when needed
- may call framework runtime APIs when that behavior is boundary-owned (for example auth/session/runtime entry coupling)
- must not depend on `app/`
- keep request/session context reads in dedicated boundary modules (for example `server/modules/auth/**`), and pass identity/context into domain modules explicitly
- must not contain UI rendering logic

Typical flow:

```text
app/**/actions.ts -> server/modules/<domain> -> server/services/<domain>/* -> server/lib/*
```

### 6.5 Infrastructure Access

For PostgreSQL, Redis, queues, email, and similar infrastructure:

- access them only from server-owned modules
- prefer calling server/domain code directly from rendering code instead of creating internal HTTP hops
- keep credentials, connection setup, and retry logic out of client-owned and cross-runtime modules
- treat cache and queue behavior as privileged infrastructure

## 7. Repository-Specific Placement Rules

When placing code in this repository:

1. apply the mother documents first
2. use this document to map ownership to the actual repository directories
3. use focused boundary files when the concern is narrower than the repository architecture

Examples:

- component, hook, client adapter, or form boundary question -> `react-client-state-and-forms-rules.md`
- action/use-case boundary question -> this file
- repository placement question -> this file plus `project-governance-rules.md`

## 8. Evolution Rules

As the project grows:

- preserve the current simple structure unless complexity clearly justifies expansion
- add directories only when they improve clarity
- avoid inventing layers that the project does not yet need
- prefer stable ownership over fashionable abstractions

## 9. Domain-Specific Owner Constraints

This section defines explicit ownership rules for specific domains to prevent structural drift.

### 9.1 Assets Domain

Owner: `server/services/assets/`

Owns:
- asset CRUD operations (query, command, mutation)
- asset data access patterns
- asset embedding configuration and scheduling
- asset-to-domain coordination (todos, notes, bookmarks)

Allowed dependencies (assets may import from):
- `server/lib/db/` - database access
- `server/lib/config/` - server-side constants
- `shared/assets/` - shared types and schemas

Forbidden dependencies (assets must NOT import from):
- `server/services/search/` - search is a downstream consumer, not an upstream dependency
- `app/**` - app is an upstream consumer
- `server/modules/**` - entry layer should call services, not vice versa

### 9.2 Search Domain

Owner: `server/services/search/`

Owns:
- search query parsing and normalization
- keyword and semantic search implementation
- search result ranking and merging
- search-specific time hint parsing

Allowed dependencies (search may import from):
- `server/services/assets/` - assets are upstream data sources (embedding config, provider)
- `server/lib/config/` - server-side constants
- `shared/assets/` - shared types for assets

Forbidden dependencies (search must NOT import from):
- `app/**` - app is an upstream consumer
- `server/modules/**` - entry layer is upstream
- `server/modules/workspace/*.ts` - summary/review orchestration belongs in workspace module layer

### 9.3 Summary Modules (`notes.summary.ts`, `todos.review.ts`, `bookmarks.summary.ts`)

These module-level flow units coordinate domain-specific asset listing and model summarization/review.

Owner: `server/modules/workspace/*.summary.ts` and `server/modules/workspace/*.review.ts`

Allowed dependencies:
- `server/services/assets/` - to list assets of a specific type

Forbidden dependencies:
- `server/services/search/` - search is not a data source for summary operations
- `app/**` - app is an upstream consumer

### 9.4 Split Decision Protocol

When a capability crosses domain boundaries (e.g., search needs to understand asset structure):

1. Define a shared interface/type in `shared/` if the contract is truly cross-domain
2. Keep the implementation in the owning domain
3. Downstream consumers import from the owning domain's interface, not its implementation details
4. If assets needs search capability, this indicates a layering violation - search should be orchestrated via `server/modules/workspace`

Fallback condition:
- If immediate refactoring is not feasible, create a temporary interface in `shared/` that bridges the gap
- Document the violation in code comments with `TODO: resolve boundary violation`
- Schedule the violation for resolution in next refactoring phase

## 10. Related Rules

- `.ai-rules/project-governance-rules.md`
- `.ai-rules/universal-development-boundary-rules.md`
- `.ai-rules/react-client-state-and-forms-rules.md`
