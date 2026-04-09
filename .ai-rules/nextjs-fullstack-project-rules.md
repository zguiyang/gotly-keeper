# Next.js Full-Stack Project Rules

## 1. Scope

These rules describe how code should be organized and extended in the current repository.

The current project structure is:

```txt
app/
components/
lib/
modules/
shared/
public/
.ai-rules/
DESIGN.md
AGENTS.md
```

Future growth should follow these rules without inventing unnecessary layers too early.

## 2. Core Principles

- Keep routing and page entry files thin.
- Keep business logic out of page files whenever possible.
- Let domain logic grow into `modules/` instead of scattering it across pages.
- Keep cross-domain infrastructure in `shared/`.
- Prefer server-first data access.
- Maintain strict server/client boundaries.
- Treat security and data minimization as default requirements.

## 3. Directory Responsibilities

### 3.1 `app/`

`app/` is responsible for route entry files and route-level composition:

- `page.tsx`
- `layout.tsx`
- `loading.tsx`
- `error.tsx`
- `not-found.tsx`
- `api/**/route.ts`

Rules:

- Do not place heavy business logic directly in `app/`.
- Do not access the database directly from route entry files or page components.
- Keep route files focused on orchestration, rendering, and request/response handling.

### 3.2 `components/`

`components/` contains reusable UI building blocks.

Rules:

- Keep presentational components reusable and focused.
- Prefer Server Components by default unless client-side interactivity is required.
- When a Client Component is needed, pass only the minimum safe data it needs.

### 3.3 `lib/`

`lib/` contains shared utilities and low-level helpers.

Rules:

- Put generic helpers here, not page-specific business logic.
- Keep helpers framework-aware when necessary, but avoid mixing unrelated concerns.
- If business logic starts growing, extract it into clearer server-side modules rather than overloading `lib/`.

### 3.4 `modules/`

`modules/` is reserved for domain-oriented server-side logic as the application grows.

Rules:

- Group business logic by domain when it becomes substantial.
- Keep domain behavior out of `app/` once it starts accumulating branching, permissions, or orchestration.
- Prefer clear entry points per domain instead of spreading behavior across many unrelated files.
- Prefer file names such as `modules/<domain>/<domain>.service.ts` and `modules/<domain>/<domain>.model.ts`.
- Treat `<domain>.service.ts` as the main domain service entry point.
- Use `<domain>.model.ts` for model-layer logic, mapping, and domain-shaped data helpers.

### 3.5 `shared/`

`shared/` is reserved for cross-domain server utilities and infrastructure.

Rules:

- Put shared infrastructure here, not inside page files.
- Keep `shared/` generic and reusable across domains.
- Do not turn `shared/` into a dumping ground for arbitrary business logic.

## 4. Data Fetching Rules

1. Prefer fetching data in Server Components.
2. Do not make internal pages call their own internal API routes just to fetch app data.
3. If server-side data is needed for rendering, fetch it directly in the server layer instead of round-tripping through HTTP.
4. Reserve `app/api/**/route.ts` for real HTTP interfaces such as public APIs, callbacks, and integrations.
5. As domain complexity grows, move data access and orchestration into `modules/`.

## 5. Server and Client Boundaries

1. Server-only logic must remain on the server.
2. Client Components must not import server-only modules, database access code, or privileged helpers.
3. Sensitive logic should stay in server-side code paths.
4. Shape and trim data before passing it from the server into client components.

If a file is intended for server-only use, explicitly protect it with:

```ts
import 'server-only'
```

## 6. API Route Rules

For any `app/api/**/route.ts` file:

- validate input
- authenticate when required
- authorize when required
- return only safe response fields
- avoid leaking sensitive internal errors

API routes are not the default data layer for internal page rendering.

## 7. UI Rules

All UI work must align with `DESIGN.md`.

Before changing UI, read `DESIGN.md` if the task touches:

- page layout
- typography
- spacing
- cards
- buttons
- colors
- visual hierarchy
- motion
- global styles

Do not introduce a conflicting visual language unless the user explicitly asks for a redesign.

## 8. AI Code Generation Rules

When generating or editing code:

1. Keep `app/` files thin.
2. Prefer reusable UI in `components/`.
3. Prefer shared helpers in `lib/`.
4. Prefer domain-oriented business logic in `modules/`.
5. Prefer shared infrastructure in `shared/`.
6. Keep sensitive logic on the server.
7. Pass only minimal safe props into Client Components.
8. Do not introduce unnecessary architecture that the current project does not need yet.
9. When adding domain files in `modules/`, prefer `*.service.ts` and `*.model.ts` naming.

## 9. Next.js Version Rule

This project uses a modern Next.js version with behavior that may differ from stale framework memory.

Before changing framework-facing code:

1. Read the relevant docs in `node_modules/next/dist/docs/`.
2. Check for deprecations.
3. Prefer official or runtime-backed guidance over memory.

## 10. Evolution Rule

As the project grows:

- preserve the current simple structure unless complexity clearly justifies expansion
- introduce new abstractions only when they reduce confusion or duplication
- avoid pushing business logic into route entry files just because the project is still small

The target is disciplined growth, not premature architecture.
