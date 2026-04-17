# AI Rules Index

This file is the routing table for `.ai-rules/`.

Use this file as an index only.

## Layers

- `core/`: always-loaded minimal rules
- `domain/`: load by touched code path
- `advanced-workflows/`: load only when explicitly required

## Default Read Order

1. `AGENTS.md`
2. `.ai-rules/core/default-execution-workflow.md`
3. this file
4. only the smallest set of rules needed for touched files

## Core Files

- `.ai-rules/core/project-governance-rules.md`
- `.ai-rules/core/project-architecture-rules.md`
- `.ai-rules/core/project-tooling-and-runtime-rules.md`
- `.ai-rules/core/testing-and-integration-rules.md`
- `.ai-rules/core/coding-style-rules.md`

## Capability Boundary Source

- `PROJECT_CAPABILITIES.md` is the single source of truth for what infrastructure and product capabilities are currently in scope.
- For `small-edit`, `feature/refactor`, and `debug` tasks, check this file before implementation.
- If a requested or implied change crosses capability boundaries, ask the user before coding.

## Domain Routing

- `server/**` -> `.ai-rules/domain/backend-architecture-principles.md`
- `components/**`, `hooks/**`, `client/**`, `config/**` -> `.ai-rules/domain/frontend-architecture-principles.md`
- forms/state/validation -> `.ai-rules/domain/react-client-state-and-forms-rules.md`
- AI SDK/model/agent/streaming -> `.ai-rules/domain/ai-sdk-rules.md`

Do not load all domain files by default.

## Advanced Workflows

Load these only when explicitly requested by task scope:

- `.ai-rules/advanced-workflows/phase-execution-protocol.md`
- `.ai-rules/advanced-workflows/git-commit-rules.md`
- `.ai-rules/advanced-workflows/guards/**`
- `.ai-rules/advanced-workflows/scripts/**`
- `.ai-rules/advanced-workflows/templates/**`

Do not load advanced workflows for ordinary question/small-edit/feature/debug tasks.
