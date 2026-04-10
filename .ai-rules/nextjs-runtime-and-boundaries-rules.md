# Next.js Runtime and Boundaries Rules

## 1. Scope

These rules define how runtime-facing Next.js code should handle data fetching, API routes, and server/client boundaries in this repository.

Use this file for decisions that affect rendering flow, data access, request handling, and what is allowed to run on the client.

## 2. Data Fetching Rules

1. Prefer fetching data in Server Components.
2. Do not make internal pages call their own internal API routes just to fetch app data.
3. If server-side data is needed for rendering, fetch it directly in the server layer instead of round-tripping through HTTP.
4. Reserve `app/api/**/route.ts` for real HTTP interfaces such as public APIs, callbacks, integrations, OAuth flows, auth endpoints, or cases where an actual network boundary is required.
5. `app/api/**/route.ts` is optional. Do not create it unless the product actually needs an HTTP boundary.
6. As domain complexity grows, move data access and orchestration into `server/` rather than leaving it inside route entry files.

## 3. Server and Client Boundaries

1. Server-only logic must remain on the server.
2. Client Components must not import server-only modules, database access code, Redis clients, or other privileged helpers.
3. Sensitive logic should stay in server-side code paths.
4. Shape and trim data before passing it from the server into client components.
5. Pass only the minimum safe props needed by Client Components.

If a file is intended for server-only use, explicitly protect it with:

```ts
import 'server-only'
```

## 4. API Route Rules

For any `app/api/**/route.ts` file:

- validate input
- authenticate when required
- authorize when required
- return only safe response fields
- avoid leaking sensitive internal errors

API routes are not the default data layer for internal page rendering.

### 4.1 Data Store and Cache Access

For PostgreSQL, Redis, and similar infrastructure clients:

- access them only from server-side modules
- prefer calling server/domain code directly from Server Components instead of creating internal HTTP hops
- keep credentials, connection setup, and retry logic out of Client Components and shared cross-runtime modules
- treat cache and queue behavior as privileged infrastructure, not as client-side state

## 5. Full-Stack Project Reminder

This repository is a Next.js full-stack application, not a frontend/backend split system.

That means:

- prefer direct server-side access over internal HTTP hops
- keep rendering, server logic, and integration boundaries coherent
- introduce network boundaries only when they serve a real interface or integration need
- keep server-only business logic inside `server/`, not in route entry files

## 6. Client-Side Library Reminder

When using client-focused libraries such as `ahooks` or `@tanstack/react-form`:

- keep them inside intentional Client Components
- do not use them to replace server-rendered data access
- validate sensitive or persisted data again on the server
- read `.ai-rules/react-client-state-and-forms-rules.md` for the detailed rules
