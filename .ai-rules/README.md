# AI Rules Index

This directory is the canonical index of repository rules for AI agents.

Use this file as a routing table, not as a second rule body.

## Read Order

1. `AGENTS.md`
2. this file
3. the governance mother documents
4. backend behavior principles (`backend-architecture-principles.md`) for server-side work
5. the project-specific architecture rule
6. only the topic files relevant to the task
7. execution protocols and guards only when needed
8. framework, package, or MCP-backed docs when the relevant rule requires them

## Hierarchy

Read and apply rules in this order:

1. **Governance mother documents**
   - `.ai-rules/project-governance-rules.md`
   - `.ai-rules/universal-development-boundary-rules.md`
2. **Backend behavior principles (server-side umbrella)**
   - `.ai-rules/backend-architecture-principles.md`
3. **Frontend behavior principles (client-side umbrella)**
   - `.ai-rules/frontend-architecture-principles.md`
4. **Project-specific architecture**
   - `.ai-rules/project-architecture-rules.md`
5. **Type/topic rules**
   - frontend, actions, forms, style, AI SDK, testing, commits, tooling
6. **Execution layer**
   - protocols, lessons, and guard scripts

Meaning:

- mother documents define reusable governing principles
- project architecture defines how those principles map to this repository
- topic rules add narrow repository-specific constraints only
- execution-layer files define workflow mechanics only
- mother documents must stay principle-level and must not contain repository path patterns or file placement matrices

## Rule Map

### Mother documents

- `.ai-rules/project-governance-rules.md`
- `.ai-rules/universal-development-boundary-rules.md`

### Core architecture

- `.ai-rules/project-architecture-rules.md`

### Backend umbrella principles

- `.ai-rules/backend-architecture-principles.md`

### Frontend umbrella principles

- `.ai-rules/frontend-architecture-principles.md`

### Focused boundaries

- `.ai-rules/react-client-state-and-forms-rules.md`

### Implementation topics

- `.ai-rules/coding-style-rules.md`
- `.ai-rules/ai-sdk-rules.md`
- `.ai-rules/project-tooling-and-runtime-rules.md`
- `.ai-rules/testing-and-integration-rules.md`
- `.ai-rules/git-commit-rules.md`

### Execution protocol

- `.ai-rules/phase-execution-protocol.md`
- `.ai-rules/scripts/create-ai-worktree.sh` for standardized phase worktree setup with rule baseline lock
- `.ai-rules/scripts/sync-phase-artifacts.sh` for syncing phase artifacts from worktree to primary local workspace
- `.ai-rules/scripts/ai-bootstrap-check.sh` for worktree bootstrap and baseline drift checks
- `.ai-rules/guards/check-phase-doc-protocol.sh` for optional phase document validation
- `.ai-rules/guards/check-phase-artifact-sync.sh` for blocking unsynced phase artifacts in worktree mode
- `.ai-rules/guards/check-import-boundaries.sh` for optional architecture boundary validation
- `.ai-rules/guards/check-rules-integrity.sh` for protected governance file change detection
- `.ai-rules/templates/phase-task-report.template.md` for mandatory per-phase task reporting
- `.ai-rules/templates/phase-failure-report.template.md` for fail-fast failure reporting
- `.ai-rules/templates/phase-plan-minimal.template.md` for new phase document bootstrap

## Task Routing

- repository-specific architecture and directory mapping: read `project-architecture-rules.md`
- repository surfaces, file placement, local workspaces, project-vs-AI boundary: read `project-governance-rules.md`
- turning ideas into layered implementations with clear ownership and reuse boundaries: read `universal-development-boundary-rules.md`
- server-side behavior boundaries, contracts, and architecture enforcement baseline: read `backend-architecture-principles.md`
- frontend behavior boundaries and unit-type enforcement baseline: read `frontend-architecture-principles.md`
- rendering, route handlers, server/client boundaries, and framework entry behavior: read `project-architecture-rules.md`
- components, hooks, client adapters, client forms, and validation: read `react-client-state-and-forms-rules.md`
- coding style, naming, imports/exports, formatting conventions: read `coding-style-rules.md`
- AI SDK, models, agents, streaming: read `ai-sdk-rules.md`
- tooling, scripts, services, MCP, browser inspection: read `project-tooling-and-runtime-rules.md`
- tests and verification strategy: read `testing-and-integration-rules.md` (`test suites = isolated logic`, `browser verification = real business outcomes`)
- staging and commits: read `git-commit-rules.md`
- phase execution gates and artifacts: read `phase-execution-protocol.md`
- any coding session bootstrap (required): run `bash .ai-rules/scripts/ai-bootstrap-check.sh` before implementation
- parallel phase workspace bootstrap: run `bash .ai-rules/scripts/create-ai-worktree.sh <phase_id> [branch_type]`
- worktree readiness and rule baseline check: run `bash .ai-rules/scripts/ai-bootstrap-check.sh --worktree .worktrees/<phase_id>`
