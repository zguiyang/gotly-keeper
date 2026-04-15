# AI Rules Index

This directory is the canonical index of repository rules for AI agents.

Use this file as a routing table, not as a second rule body.

## Read Order

1. `AGENTS.md`
2. this file
3. the governance mother documents
4. the project-specific architecture rule
5. only the topic files relevant to the task
6. execution protocols and guards only when needed
7. framework, package, or MCP-backed docs when the relevant rule requires them

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

### Focused boundaries

- `.ai-rules/react-client-state-and-forms-rules.md`

### Implementation topics

- `.ai-rules/ai-sdk-rules.md`
- `.ai-rules/project-tooling-and-runtime-rules.md`
- `.ai-rules/testing-and-integration-rules.md`
- `.ai-rules/git-commit-rules.md`

### Execution protocol

- `.ai-rules/phase-execution-protocol.md`
- `.ai-rules/guards/check-phase-doc-protocol.sh` for optional phase document validation
- `.ai-rules/guards/check-import-boundaries.sh` for optional architecture boundary validation
- `.ai-rules/templates/phase-task-report.template.md` for mandatory per-phase task reporting
- `.ai-rules/templates/phase-failure-report.template.md` for fail-fast failure reporting
- `.ai-rules/templates/phase-plan-minimal.template.md` for new phase document bootstrap

## Task Routing

- repository-specific architecture and directory mapping: read `project-architecture-rules.md`
- repository surfaces, file placement, local workspaces, project-vs-AI boundary: read `project-governance-rules.md`
- turning ideas into layered implementations with clear ownership and reuse boundaries: read `universal-development-boundary-rules.md`
- rendering, route handlers, server/client boundaries, and framework entry behavior: read `project-architecture-rules.md`
- components, hooks, client adapters, client forms, and validation: read `react-client-state-and-forms-rules.md`
- AI SDK, models, agents, streaming: read `ai-sdk-rules.md`
- tooling, scripts, services, MCP, browser inspection: read `project-tooling-and-runtime-rules.md`
- tests and verification strategy: read `testing-and-integration-rules.md` (`test suites = isolated logic`, `browser verification = real business outcomes`)
- staging and commits: read `git-commit-rules.md`
- phase execution gates and artifacts: read `phase-execution-protocol.md`
