<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. APIs, conventions, and file structure may differ from old habits and model memory. Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Gotly AI Agent Entry Guide

## Purpose

`AGENTS.md` is the entry document for AI agents.

It should not duplicate the full project rules. Its job is to tell an agent:
- which documents define the project rules
- which document defines the UI rules
- which MCP services are available
- which local skills exist
- what to read before changing code

## Read Order

Start in this order:

1. Read `AGENTS.md`.
2. Read the relevant files in `.ai-rules/`.
3. Read `DESIGN.md` before any UI or styling work.
4. Read the relevant docs in `node_modules/next/dist/docs/` before changing Next.js behavior.

## Instruction Priority

When instructions conflict, use this order:

1. Direct user request
2. `AGENTS.md`
3. `.ai-rules/*.md`
4. `DESIGN.md`
5. Official framework and library documentation

## Project Rule Files

Project architecture and coding rules live in `.ai-rules/`.

Current rule files:
- `.ai-rules/nextjs-fullstack-project-rules.md`

How to use them:
- Read `.ai-rules/nextjs-fullstack-project-rules.md` for project structure, server/client boundaries, API rules, and `modules/` / `shared/` conventions.
- Treat `.ai-rules` as the source of truth for implementation rules.
- Do not restate those rules in `AGENTS.md`; update the rule file instead.

## UI Rules

UI and visual direction live in `DESIGN.md`.

Read `DESIGN.md` before changing:
- `app/page.tsx`
- `app/globals.css`
- reusable UI in `components/`
- typography, spacing, buttons, cards, colors, layout, or motion

Treat `DESIGN.md` as the source of truth for visual decisions.

## Current Project Structure

The current repository includes:
- `app/`
- `components/`
- `lib/`
- `modules/`
- `shared/`
- `.ai-rules/`
- `DESIGN.md`

Agents should follow the actual repository structure and the conventions defined in `.ai-rules`.

## MCP Services

Use MCP when it improves correctness, documentation accuracy, or runtime verification.

Available MCP categories:
- Next.js DevTools MCP: use for Next.js docs, runtime diagnostics, route/runtime inspection, and browser-backed verification.
- Playwright MCP: use for real browser interaction, screenshots, console inspection, and UI verification.
- shadcn MCP: use for registry lookup, add commands, component inspection, and examples.
- Context7 MCP: use for package documentation outside the Next.js docs flow.
- GitHub MCP / Plugin: use for PRs, issues, reviews, CI status, and repository metadata.

Usage rule:
- For framework behavior, prefer official docs and runtime-aware MCP tools over memory.

## Local Skills

Project-local skills live in `.agents/skills/`.

Current skill set:
- `next-best-practices`
- `next-cache-components`
- `nextjs-app-router-patterns`
- `vercel-react-best-practices`
- `vercel-composition-patterns`
- `shadcn`
- `react-components`
- `tailwindcss-advanced-layouts`
- `tailwindcss-animations`
- `better-auth-best-practices`
- `drizzle-orm`
- `zod`

How to use skills:
- Match the task to the relevant skill.
- Read that skill's `SKILL.md` before implementing.
- Use the smallest relevant set of skills for the task.

Typical mapping:
- Next.js app/router work: `next-best-practices`, `nextjs-app-router-patterns`
- caching work: `next-cache-components`
- UI/component work: `shadcn`, `react-components`, `tailwindcss-advanced-layouts`, `tailwindcss-animations`
- React performance/composition work: `vercel-react-best-practices`, `vercel-composition-patterns`
- auth work: `better-auth-best-practices`
- data layer work: `drizzle-orm`
- validation work: `zod`

## Editing Rule

Before editing code:
- identify the relevant rule file in `.ai-rules`
- identify whether `DESIGN.md` applies
- identify whether a local skill applies
- identify whether official Next.js docs or MCP runtime inspection is needed

If a rule changes, update the rule document in `.ai-rules`, not `AGENTS.md`, unless the entry workflow itself has changed.
