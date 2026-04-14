# Next.js Full-Stack Project Rules

## 1. Scope

This document is the umbrella rule file for the current repository.

It defines the stable architectural rules for a Next.js full-stack project that is built as one integrated application rather than as separate frontend and backend codebases.

Use this file for long-lived structure and layering rules.

Use topic-specific files in `.ai-rules/` for rules that are more likely to grow or change independently.

This file defines directory responsibilities and boundaries, not a complete top-level directory inventory.

Future growth should follow these rules without inventing unnecessary layers too early.

## 2. Core Principles

- Keep routing and page entry files thin.
- Keep business logic out of page files whenever possible.
- Let server-side domain logic grow into `server/` instead of scattering it across pages.
- Keep cross-runtime shared code in `shared/`.
- Prefer integrated full-stack design over frontend/backend separation.
- Treat security and data minimization as default requirements.
- Keep privileged infrastructure access such as database and Redis clients on the server-only side.

## 3. Rule File Strategy

`.ai-rules/` should stay small and readable.

Use these rules when deciding whether to split documents:

1. Keep stable architecture rules in this umbrella file.
2. Move a topic into its own file when it starts growing independently or is updated more frequently than the umbrella rules.
3. Split by topic, not by frontend versus backend, because this repository is one Next.js full-stack application with a lightweight server-side directory.
4. Do not create extra rule files unless they reduce ambiguity or maintenance cost.

## 4. Directory Responsibilities

These responsibilities describe the main architectural anchors in the repository.

They are intentionally not a complete directory list. New directories such as `hooks/`, `types/`, `styles/`, or other focused folders may be added when they improve clarity and do not violate these boundaries.

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
- Do not define business constants in components; use centralized config locations.

### 4.2.1 Constants and Config Governance

Constants and configuration values must be centralized to prevent duplication and magic numbers.

Rules:

1. **Server-side constants** (embedding, search, timeouts, limits): Define in `server/config/`.
2. **Frontend UI config** (nav items, filters, presentation): Define in `config/`.
3. **Cross-runtime constants** (non-sensitive shared values): Define in `shared/constants/`.
4. Each constant must have exactly one canonical source.
5. All files import from the canonical source, not local definitions.
6. Do not scatter business constants across multiple files.

### 4.2.2 Frontend Boundary Rules

Components must not contain state machine, call orchestration, or direct imports from `app/**/actions`.

Rules:

1. **State machine logic**: Define in `hooks/**`.
2. **Server action client adapters**: Define in `client/actions/**`.
3. **Toast/action feedback**: Define in `client/feedback/**`.
4. Components only handle UI rendering and event binding.
5. Call chain direction: `components -> hooks -> client/actions -> app server actions`.

See `docs/architecture/frontend-boundary-rules.md` for detailed frontend boundary specifications.

### 4.3 `lib/`

`lib/` contains lightweight shared utilities and low-level helpers.

Rules:

- Put generic helpers here, not page-specific business logic.
- Keep `lib/` small and boring. It should not become a second server architecture layer.
- This is the right place for utilities such as `cn`, formatting helpers, and other reusable pure helpers that are safe to share across the app.
- If code becomes server-only business logic, move it into `server/` instead of overloading `lib/`.

### 4.4 `server/`

`server/` is reserved for domain-oriented server-side logic as the application grows.

Rules:

- Group business logic by domain when it becomes substantial.
- Keep domain behavior out of `app/` once it starts accumulating branching, permissions, or orchestration.
- Prefer clear entry points per domain instead of spreading behavior across many unrelated files.
- Prefer a lightweight structure such as `server/<domain>/`.
- Prefer file names such as `server/<domain>/<domain>.service.ts` and `server/<domain>/<domain>.model.ts`.
- Treat `<domain>.service.ts` as the main domain service entry point.
- Use `<domain>.model.ts` for model-layer logic, mapping, and domain-shaped data helpers.
- Do not introduce nested layers such as `server/modules/` or `server/common/` unless the codebase genuinely needs them.
- Keep database access, Redis access, job orchestration, and other privileged infrastructure integrations in server-only code paths.

### 4.4.1 Application Layer (`server/application/`)

The `server/application/` directory contains use-case orchestration layer:

Rules:

- `server/application/<domain>/` contains use-cases that orchestrate domain services
- Use-case files follow `<action>.use-case.ts` naming convention
- Use-cases handle business logic branching, cross-domain coordination, and error translation
- Use-cases **must not** depend on `app/` layer (Next.js route handlers)
- Use-cases **must not** call `revalidatePath()` or other Next.js runtime APIs
- Use-cases delegate to domain services in `server/<domain>/`

Example structure:
```
server/
  application/
    workspace/
      create-workspace-asset.use-case.ts
      set-todo-completion.use-case.ts
      workspace.types.ts
      index.ts
  assets/
    assets.service.ts
```

See `docs/architecture/action-application-boundary-rules.md` for detailed specifications.

### 4.5 `shared/`

`shared/` is reserved for cross-runtime shared code that is intentionally reused by both server and client.

Rules:

- Put shared types, schemas, constants, and utilities here when both server and client need them.
- Keep `shared/` generic and reusable across domains.
- Do not move server-only business logic or privileged infrastructure into `shared/`.
- If code is only reused on the server, prefer `server/<domain>/` or a focused server-only helper rather than pushing it into `shared/`.

### 4.6 Server-Side Infrastructure Rule

Infrastructure clients such as PostgreSQL connections, Redis clients, queue adapters, admin SDKs, and other credentialed integrations are server-only concerns.

Rules:

- Do not import infrastructure clients into Client Components.
- Do not place privileged connection code in `shared/`.
- Prefer wrapping infrastructure access in domain-oriented server modules instead of spreading raw client usage across route files.
- It is acceptable to use focused server-only helpers for infrastructure setup when that is clearer than putting connection code directly inside a domain service.

## 5. Topic Files

Read topic-specific rule files when the task touches those areas.

Current topic files:

- `.ai-rules/nextjs-runtime-and-boundaries-rules.md`
- `.ai-rules/react-client-state-and-forms-rules.md`
- `.ai-rules/project-tooling-and-runtime-rules.md`
- `.ai-rules/testing-and-integration-rules.md`
- `.ai-rules/git-commit-rules.md`
- `.ai-rules/ai-sdk-rules.md`

## 6. AI Code Generation Rules

When generating or editing code:

1. Keep `app/` files thin.
2. Prefer reusable UI in `components/`.
3. Prefer shared helpers in `lib/`.
4. Prefer domain-oriented business logic in `server/`.
5. Prefer cross-runtime shared contracts and utilities in `shared/`.
6. Do not introduce unnecessary architecture that the current project does not need yet.
7. When adding domain files in `server/`, prefer `*.service.ts` and `*.model.ts` naming.
8. When adding reusable validation files, prefer `*.schema.ts` naming.

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

## 9. Layered Architecture Boundary Rules (Enforced)

The architecture follows a strict unidirectional dependency layer:

```
app/actions -> application -> domain -> infra
```

**Rule**: No reverse dependencies allowed.

### 9.1 Layer Definitions

| Layer | Path | Can Import |
|-------|------|------------|
| `app/actions` | `app/**/actions.ts` | `server/application` only |
| `application` | `server/application/<domain>/*.use-case.ts` | `server/<domain>` only |
| `domain` | `server/<domain>/*.service.ts`, `server/<domain>/models/` | `server/infra` only |
| `infra` | `server/infra/**`, `server/config/**` | External libs only |

### 9.2 Forbidden Patterns

- `server/**` must NOT import `app/**`
- `server/application/**` must NOT import `app/**`
- `server/domain/**` must NOT import `server/application/**`
- `server/infra/**` must NOT import `server/domain/**` or `server/application/**`

### 9.3 Phase Plan Execution Protocol

Every phase plan document MUST include:

```yaml
phase_id: <unique-id>
depends_on: [<phase-id>, ...]  # or [] if no dependencies
parallel_safe: true|false
base_branch_rule: <rule>
branch_naming_rule: <pattern>
worktree_naming_rule: <pattern>
failure_report_path: <path>
merge_strategy: PR-only
artifact_dir: docs/superpowers/plans/artifacts
verification_report_path: docs/superpowers/plans/artifacts/${phase_id}.verification-report.md
```

Reporting contract (required):
- All plan artifacts must use `${phase_id}` as filename prefix.
- Minimum required artifacts:
  - `${phase_id}-failure-report.md`
  - `${phase_id}.verification-report.md`
- If dependency check fails in Preflight, stop immediately and write `${phase_id}-failure-report.md`.

Required gates (must execute in order):
1. **Preflight Gate**: Dependency check before starting
2. **Start Gate**: Branch baseline verification
3. **Sync Gate**: Rebase on main + lint before merge
4. **Fail-Fast**: Any gate failure stops execution immediately

Required merge: **PR-only** (no direct merge to main)
