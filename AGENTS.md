<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. APIs, conventions, and file structure may differ from old habits and model memory. Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Gotly AI Agent Entry Guide

## Purpose

`AGENTS.md` is the entry document for AI agents.

It should stay minimal and point to canonical rule files.

## Read Order

Start in this order:

1. Read `AGENTS.md`.
2. Read `.ai-rules/README.md`.
3. Read the relevant `.ai-rules/*.md` files routed by `.ai-rules/README.md`.
4. Read the relevant docs in `node_modules/next/dist/docs/` before changing Next.js behavior.

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

Project architecture and coding rules live in `.ai-rules/`.

Use `.ai-rules/README.md` as the index and routing table.

Rules:
- Treat `.ai-rules/` as the source of truth for implementation rules.
- Do not restate full rules in `AGENTS.md`; update the rule file instead.

## MCP Services

Use MCP when it improves correctness, documentation accuracy, or runtime verification.

Rules:
- Prefer relevant local skills first.
- Use runtime-aware MCP tools when code inspection alone is insufficient.
- Follow `.ai-rules/project-tooling-and-runtime-rules.md` for tool-selection details.

## Local Skills

Project-local skills live in `.agents/skills/`.

How to use skills:
- Match the task to the relevant skill.
- Read that skill's `SKILL.md` before implementing.
- Use the smallest relevant set of skills for the task.

## Editing Rule

Before editing code:
- identify the umbrella rule file and relevant topic files in `.ai-rules`
- identify whether a local skill applies
- identify whether official Next.js docs or MCP runtime inspection is needed
- identify whether `.ai-rules/project-tooling-and-runtime-rules.md` applies to the task
- verify live project details from code or config instead of relying on memory
- read `.ai-rules/phase-execution-protocol.md` only when the task actually uses phase execution workflow

If a rule changes, update the rule document in `.ai-rules`, not `AGENTS.md`, unless the entry workflow itself has changed.
