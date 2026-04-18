# AI Rules Index

This file is the routing table for `.ai-rules/`.

Use this file as an index only.

## Layers

- `core/`: entry and task-routing rules, with detailed files loaded by need
- `domain/`: load by touched code path
- `advanced-workflows/`: load only when explicitly required

## Default Read Order

1. `AGENTS.md`
2. `.ai-rules/core/default-execution-workflow.md`
3. this file
4. only the smallest set of rules needed for touched files

Do not interpret `core/` as "read every core file on every task." The always-loaded core context is only the entry workflow and this routing index. Load the other core files when the task touches their concern.

## Core Files

- `.ai-rules/core/project-governance-rules.md`
- `.ai-rules/core/project-architecture-rules.md`
- `.ai-rules/core/project-tooling-and-runtime-rules.md`
- `.ai-rules/core/testing-and-integration-rules.md`
- `.ai-rules/core/coding-style-rules.md`
- `.ai-rules/core/skill-routing-rules.md`

## Minimal Context Packages

Use these as the default context budget:

- `question`: `AGENTS.md`, default workflow, this index, and only cited or directly relevant files.
- `small-edit`: add `PROJECT_CAPABILITIES.md`, the touched-file domain rule, and coding style only if editing code.
- `feature/refactor`: add capability boundary, architecture placement rules, touched-file domain rules, and testing rules.
- `debug`: add tooling/runtime rules and testing rules, then touched-file domain rules once the failing area is known.
- governance/rule edits: add project governance and tooling/runtime rules, then run the governance preflight defined there.
- skill selection: add skill routing rules only when a task may benefit from a skill or when choosing between skills is uncertain.
- commit/PR/phase/subagent: load the matching advanced workflow only after the user explicitly requests that workflow.

For Next.js behavior changes, read the relevant guide in `node_modules/next/dist/docs/` after identifying the exact behavior being changed. Do not preload broad Next.js docs for unrelated code edits.

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
