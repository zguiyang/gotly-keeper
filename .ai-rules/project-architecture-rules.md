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

Use framework-specific skills and docs for framework behavior details.

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

Owns server-side business logic and infrastructure-facing code.

Rules:

- group server logic by domain
- keep database, Redis, queue, email, and other privileged capabilities in server-owned modules
- prefer domain-oriented entry points over scattered server logic

#### 4.7.1 `server/application/`

Owns use-case orchestration.

Rules:

- use `server/application/<domain>/` for use-cases
- use `<action>.use-case.ts` naming
- keep orchestration, cross-domain coordination, and error translation here
- define use-case input/output types in `<domain>.types.ts` when they do not already belong in `shared/`
- do not depend on `app/`
- do not call framework runtime APIs from this layer

#### 4.7.2 `server/<domain>/`

Owns domain services and domain-specific server capabilities.

Rules:

- use domain-oriented modules such as `<domain>.service.ts`
- keep business semantics here
- do not reach upward into route or app-layer code

#### 4.7.3 `server/config/`

Owns server-side constants and config values.

#### 4.7.4 `server/db/`, `server/cache/`, and other infra-facing modules

Own infrastructure setup and technical integration details.

### 4.8 `shared/`

Owns cross-runtime assets intentionally shared by server and client.

Rules:

- place shared types, schemas, constants, and neutral helpers here
- do not push server-only business logic into `shared/`
- only use `shared/` when the asset is truly cross-boundary

## 5. Repository-Specific Dependency Rules

This repository enforces a unidirectional dependency flow:

```text
app/actions -> application -> domain -> infra
```

Rules:

- `app/**/actions.ts` may call `server/application/**`
- `server/application/**` may call `server/<domain>/**`
- domain modules may rely on infra-facing modules
- reverse dependencies are forbidden

Forbidden patterns:

- `server/**` importing `app/**`
- `server/application/**` importing `app/**`
- domain modules importing application modules
- infra modules importing domain or application modules

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

### 6.4 Server Actions and Use-Cases

Server actions in `app/**/actions.ts` remain thin entry points.

They may:

- validate input
- authenticate
- invoke action wrappers
- invalidate cache
- delegate orchestration to use-cases

They must not:

- call domain services directly when a use-case layer exists for that flow
- contain deep business branching
- import from `@/app`
- become the home for deep business logic

Use-cases in `server/application/<domain>/`:

- own orchestration
- coordinate domain services
- translate errors
- own cross-domain coordination when needed
- must not call framework runtime APIs
- must not depend on `app/`
- must not access request/session context directly
- must not contain UI rendering logic

Typical flow:

```text
app/**/actions.ts -> server/application/<domain>/*.use-case.ts -> server/<domain>/*
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

## 9. Related Rules

- `.ai-rules/project-governance-rules.md`
- `.ai-rules/universal-development-boundary-rules.md`
- `.ai-rules/react-client-state-and-forms-rules.md`
