# Architecture Boundary Checklist

> Use this checklist when reviewing PRs or implementing changes to ensure constants and configurations follow the centralized governance rules.

## Constants Governance

- [ ] **Server-side constants** are defined in `server/config/` (e.g., `server/config/constants.ts`, `server/config/time.ts`)
- [ ] **Frontend UI configs** are defined in `config/` (e.g., `config/workspace/nav.ts`, `config/ui/asset-presentation.ts`)
- [ ] **Cross-runtime constants** are defined in `shared/constants/`
- [ ] Each constant has exactly **one canonical source**
- [ ] No **duplicate definitions** of the same constant exist across files
- [ ] All imports resolve to the **canonical source**, not local definitions
- [ ] No **magic numbers** (inline numeric values) instead of named constants
- [ ] `components/` does not contain **business logic constants** (only pure presentational values if needed)

## Directory Boundaries

- [ ] `components/` contains only UI components (no business logic)
- [ ] `server/` contains only server-side code (database, Redis, privileged operations)
- [ ] `shared/` contains only cross-runtime types, schemas, and constants
- [ ] `config/` contains frontend configuration objects (nav, filters, presentation)
- [ ] `lib/` contains lightweight utilities (cn, formatting, etc.)

## Import Rules

- [ ] No imports of `server/` modules into Client Components
- [ ] No imports of `server-only` modules into Client Components
- [ ] Infrastructure clients (PostgreSQL, Redis) are only used in `server/` code paths
- [ ] Path aliases (`@/`) are used consistently for imports

## Phase Execution Protocol

All phase plans must follow these execution rules:

- [ ] **Preflight Gate**: Dependency check (`depends_on`) passed before starting
- [ ] **Start Gate**: Branch created from latest main with correct naming (`feat/{phase_id}`)
- [ ] **Sync Gate**: Rebased on main + lint passes before merge
- [ ] **Fail-Fast**: Any gate failure stops execution immediately
- [ ] **PR-only Merge**: No direct merge to main

### Parallel Execution

- [ ] `parallel_safe: false` phases must not run concurrently
- [ ] `parallel_safe: true` phases can run concurrently with others
- [ ] Always verify `depends_on` chains before parallel execution

### Conflict Handling

- [ ] Resolve rebase conflicts before continuing
- [ ] Never force-push to `main` or shared branches
- [ ] Use `git worktree` for isolated parallel work

## PR Self-Check

Before requesting review, verify:

1. `pnpm lint` passes with no new errors
2. No duplicate constant definitions introduced
3. All constants import from canonical sources
4. New constants are placed in the correct layer (`server/config/`, `config/`, or `shared/constants/`)
5. README and documentation are updated if environment variables or directory structure changed
6. Phase execution protocol followed (Preflight → Start Gate → Development → Sync Gate → PR merge)
