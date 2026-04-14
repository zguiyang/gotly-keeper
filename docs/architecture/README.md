# Architecture Documentation

## Entry Point

This directory consolidates architecture rules, boundary definitions, and execution protocols for the Gotly AI project.

## Architecture Rules (`.ai-rules/`)

| File | Purpose |
|------|---------|
| `nextjs-fullstack-project-rules.md` | Project structure, directory responsibilities, naming conventions |
| `nextjs-runtime-and-boundaries-rules.md` | Server/client runtime boundaries, data fetching, API routes |
| `react-client-state-and-forms-rules.md` | Client state management, form handling, validation |
| `testing-and-integration-rules.md` | Test strategy, test structure, contract testing |
| `project-tooling-and-runtime-rules.md` | Build tools, npm scripts, local services |
| `git-commit-rules.md` | Commit message conventions |
| `ai-sdk-rules.md` | AI SDK usage, model calls, streaming |

## Architecture Boundary Docs (`docs/architecture/`)

| File | Purpose |
|------|---------|
| `action-application-boundary-rules.md` | Server Actions and Application layer separation |
| `frontend-boundary-rules.md` | Frontend component and routing conventions |

## Phase Execution Protocol

Execution protocol for all phase plans:

- **Preflight Gate**: Dependency check before starting any phase
- **Start Gate**: Verify branch baseline before development
- **Sync Gate**: Rebase on main + lint before merge
- **Fail-Fast**: Any gate failure stops execution immediately
- **PR-only Merge**: No direct merge to main; must use PR workflow

See: `docs/architecture/phase-execution-protocol.md`

## Directory Structure

```
gotly-ai/
├── app/                    # Next.js routes, layouts, pages
├── components/              # Reusable UI components
├── server/                 # Server-only business logic
│   ├── application/        # Use-case orchestration
│   ├── domain/             # Domain services
│   ├── infra/              # Infrastructure (DB, Redis)
│   └── test-utils/         # Test infrastructure
├── lib/                    # Shared utilities (cn, etc.)
├── shared/                 # Cross-runtime types, schemas, constants
├── .ai-rules/              # Architecture and execution rules
├── docs/architecture/      # Architecture documentation
└── docs/superpowers/       # Phase plans and execution artifacts
```

## Dependency Flow

```
app/actions -> application -> domain -> infra
     ↑
     └── server-only modules only
```

**Rule**: `app/actions` can only depend on `server/application`. No `server/**` module can import from `app/**`.
