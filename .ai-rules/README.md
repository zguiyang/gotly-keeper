# AI Rules Index

This directory is the canonical source of repository rules for AI agents.

## Read Order

1. `AGENTS.md`
2. this file
3. the governance mother documents
4. the project-specific architecture rule
5. the topic files relevant to the task
6. execution protocols and guards when needed
7. bundled framework or library docs when the relevant rule file requires them

## Global Rules

- Treat `.ai-rules/` as the normative source of implementation rules.
- Keep `AGENTS.md` as an entry guide only. Do not duplicate full rules there.
- Keep `docs/` and `prd/` as local ignored AI workspaces. Files under these directories must not be staged or committed.
- When a rule changes, update the relevant `.ai-rules/*.md` file instead of adding ad hoc guidance elsewhere.

## Hierarchy

Read and apply rules in this order:

1. **Governance mother documents**
   - `.ai-rules/project-governance-rules.md`
   - `.ai-rules/universal-development-boundary-rules.md`
2. **Project-specific architecture**
   - `.ai-rules/project-architecture-rules.md`
3. **Type/topic rules**
   - frontend, actions, forms, AI SDK, testing, commits, tooling
4. **Execution layer**
   - protocols, lessons, and guard scripts

Rules:

- Mother documents define reusable governing principles.
- Project-specific architecture defines how those principles apply in this repository.
- Type/topic rules refine behavior for a specific concern only.
- Execution-layer files define how to run or validate workflows; they must not redefine governance or architecture principles.

## Rule Map

### Mother documents

- `.ai-rules/project-governance-rules.md`
- `.ai-rules/universal-development-boundary-rules.md`

### Core architecture

- `.ai-rules/project-architecture-rules.md`
### Focused boundaries

- `.ai-rules/frontend-boundary-rules.md`
- `.ai-rules/action-application-boundary-rules.md`

### Implementation topics

- `.ai-rules/react-client-state-and-forms-rules.md`
- `.ai-rules/ai-sdk-rules.md`
- `.ai-rules/project-tooling-and-runtime-rules.md`
- `.ai-rules/testing-and-integration-rules.md`
- `.ai-rules/git-commit-rules.md`

### Execution protocol

- `.ai-rules/phase-execution-protocol.md`
- `.ai-rules/phase-execution-lessons-learned.md` for explanatory context only
- `.ai-rules/guards/check-phase-doc-protocol.sh` for optional phase document validation
- `.ai-rules/guards/check-import-boundaries.sh` for optional architecture boundary validation

## Task Routing

- repository-specific architecture and directory mapping: read `project-architecture-rules.md`
- repository surfaces, file placement, local workspaces, project-vs-AI boundary: read `project-governance-rules.md`
- turning ideas into layered implementations with clear ownership and reuse boundaries: read `universal-development-boundary-rules.md`
- rendering, route handlers, server/client boundaries, and framework entry behavior: read `project-architecture-rules.md`
- components, hooks, client adapters: read `frontend-boundary-rules.md`
- Server Actions and use-cases: read `action-application-boundary-rules.md`
- client forms, hooks, validation: read `react-client-state-and-forms-rules.md`
- AI SDK, models, agents, streaming: read `ai-sdk-rules.md`
- tooling, scripts, services, MCP, browser inspection: read `project-tooling-and-runtime-rules.md`
- tests and verification strategy: read `testing-and-integration-rules.md`
- staging and commits: read `git-commit-rules.md`
- phase execution gates and artifacts: read `phase-execution-protocol.md`
