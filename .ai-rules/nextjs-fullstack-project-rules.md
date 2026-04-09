# Next.js Full-Stack Project Rules

## 1. Scope

This document is the umbrella rule file for the current repository.

It defines the stable architectural rules for a Next.js full-stack project that is built as one integrated application rather than as separate frontend and backend codebases.

Use this file for long-lived structure and layering rules.

Use topic-specific files in `.ai-rules/` for rules that are more likely to grow or change independently.

The current project structure is:

```txt
app/
components/
lib/
modules/
shared/
public/
.ai-rules/
AGENTS.md
```

Future growth should follow these rules without inventing unnecessary layers too early.

## 2. Core Principles

- Keep routing and page entry files thin.
- Keep business logic out of page files whenever possible.
- Let domain logic grow into `modules/` instead of scattering it across pages.
- Keep cross-domain infrastructure in `shared/`.
- Prefer integrated full-stack design over frontend/backend separation.
- Treat security and data minimization as default requirements.

## 3. Rule File Strategy

`.ai-rules/` should stay small and readable.

Use these rules when deciding whether to split documents:

1. Keep stable architecture rules in this umbrella file.
2. Move a topic into its own file when it starts growing independently or is updated more frequently than the umbrella rules.
3. Split by topic, not by frontend versus backend, because this repository is one Next.js full-stack application.
4. Do not create extra rule files unless they reduce ambiguity or maintenance cost.

## 4. Directory Responsibilities

### 4.1 `app/`

`app/` is responsible for route entry files and route-level composition:

- `page.tsx`
- `layout.tsx`
- `loading.tsx`
- `error.tsx`
- `not-found.tsx`
- `api/**/route.ts`

Rules:

- Do not place heavy business logic directly in `app/`.
- Do not access the database directly from route entry files or page components unless the code is still trivial and clearly local.
- Keep route files focused on orchestration, rendering, and request/response handling.

### 4.2 `components/`

`components/` contains reusable UI building blocks.

Rules:

- Keep presentational components reusable and focused.
- Prefer Server Components by default unless client-side interactivity is required.

### 4.3 `lib/`

`lib/` contains shared utilities and low-level helpers.

Rules:

- Put generic helpers here, not page-specific business logic.
- Keep helpers framework-aware when necessary, but avoid mixing unrelated concerns.
- If business logic starts growing, extract it into clearer server-side modules rather than overloading `lib/`.

### 4.4 `modules/`

`modules/` is reserved for domain-oriented server-side logic as the application grows.

Rules:

- Group business logic by domain when it becomes substantial.
- Keep domain behavior out of `app/` once it starts accumulating branching, permissions, or orchestration.
- Prefer clear entry points per domain instead of spreading behavior across many unrelated files.
- Prefer file names such as `modules/<domain>/<domain>.service.ts` and `modules/<domain>/<domain>.model.ts`.
- Treat `<domain>.service.ts` as the main domain service entry point.
- Use `<domain>.model.ts` for model-layer logic, mapping, and domain-shaped data helpers.

### 4.5 `shared/`

`shared/` is reserved for cross-domain server utilities and infrastructure.

Rules:

- Put shared infrastructure here, not inside page files.
- Keep `shared/` generic and reusable across domains.
- Do not turn `shared/` into a dumping ground for arbitrary business logic.

## 5. Topic Files

Read topic-specific rule files when the task touches those areas.

Current topic files:

- `.ai-rules/nextjs-runtime-and-boundaries-rules.md`
- `.ai-rules/git-commit-rules.md`

## 6. AI Code Generation Rules

When generating or editing code:

1. Keep `app/` files thin.
2. Prefer reusable UI in `components/`.
3. Prefer shared helpers in `lib/`.
4. Prefer domain-oriented business logic in `modules/`.
5. Prefer shared infrastructure in `shared/`.
6. Do not introduce unnecessary architecture that the current project does not need yet.
7. When adding domain files in `modules/`, prefer `*.service.ts` and `*.model.ts` naming.

## 7. Next.js Version Rule

This project uses a modern Next.js version with behavior that may differ from stale framework memory.

Before changing framework-facing code:

1. Read the relevant docs in `node_modules/next/dist/docs/`.
2. Check for deprecations.
3. Prefer official or runtime-backed guidance over memory.

## 8. Evolution Rule

As the project grows:

- preserve the current simple structure unless complexity clearly justifies expansion
- keep the architecture integrated unless there is a real product or organizational need for separation
- introduce new abstractions only when they reduce confusion or duplication
- avoid pushing business logic into route entry files just because the project is still small

The target is disciplined growth, not premature architecture.
