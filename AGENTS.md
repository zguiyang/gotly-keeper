<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. APIs, conventions, and file structure may differ from old habits and model memory. Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Gotly AI Agent Entry Guide

## Purpose

`AGENTS.md` is the entry document for AI agents.

It must stay minimal, deterministic, and point to canonical rule files.

## Default Workflow First

Use `.ai-rules/core/default-execution-workflow.md` as the only default workflow.

Strict rule:

**If task is not explicitly marked as phase/subagent, always use default-execution-workflow.**

Phase execution, subagent workflow, and docs/prd artifacts are non-default.

## Read Order

Start in this order:

1. Read `AGENTS.md`.
2. Read `.ai-rules/core/default-execution-workflow.md`.
3. Read `.ai-rules/core/README.md`.
4. Read only the minimal path-based rules for touched files.
5. Read `node_modules/next/dist/docs/` only when changing Next.js behavior.

## Instruction Priority

When instructions conflict, use this order:

1. Direct user request
2. `AGENTS.md`
3. `.ai-rules/*.md`
4. Official framework and library documentation

## Operating Principles

Agents should reason from first principles: start from the user's original need and the underlying problem, not from habit, templates, or framework defaults.

Apply this as follows:
- Do not assume the user already knows exactly what they want. If the goal, motivation, or success criteria are unclear, pause to clarify before changing code.
- If the goal is clear but the requested path is not the shortest or strongest path to that goal, say so directly and propose the better route.
- When something fails, trace the root cause before patching symptoms. Each meaningful decision should be explainable with a clear "why".
- Keep outputs focused on decision-changing information. Remove details that do not affect the next action, tradeoff, or verification result.

## Project Rule Files

Rules in `.ai-rules/` are split into three layers:

- `core/` for entry, routing, and task-level rules loaded by need
- `domain/` for path-based rules
- `advanced-workflows/` for explicit advanced modes only

Treat `.ai-rules/` as the source of truth for implementation rules.

## Path-Based Minimal Loading

Never load all rules by default.

Load by touched code area:

- Any task: `.ai-rules/core/project-architecture-rules.md`, `.ai-rules/core/project-tooling-and-runtime-rules.md`, `.ai-rules/core/testing-and-integration-rules.md` as needed
- `server/**`: `.ai-rules/domain/backend-architecture-principles.md`
- `components/**`, `hooks/**`, `client/**`, `config/**`: `.ai-rules/domain/frontend-architecture-principles.md`
- forms/state validation concerns: `.ai-rules/domain/react-client-state-and-forms-rules.md`
- AI SDK concerns: `.ai-rules/domain/ai-sdk-rules.md`

Do not preload unrelated domain rules.

## Skills and MCP

Project-local skills live in `.agents/skills/`.

Use skills and MCP only when they reduce real uncertainty for the current task.

Do not preload all skills.

## Docs and PRD Usage

`docs/` and `prd/` are only for:

- cross-session handoff
- large feature planning

For normal tasks, keep plans in conversation or ephemeral task context.

## Advanced Workflow Trigger

Load `.ai-rules/advanced-workflows/phase-execution-protocol.md` only when the task is explicitly marked as phase/subagent.

If a rule changes, update the rule document in `.ai-rules`, not `AGENTS.md`, unless the entry workflow itself has changed.
