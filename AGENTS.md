<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. APIs, conventions, and file structure may differ from old habits and model memory. Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Gotly AI Agent Entry Guide

## Purpose

`AGENTS.md` is the entry document for AI agents.

It should not duplicate the full project rules. Its job is to tell an agent:
- which documents define the project rules
- which MCP services are available
- which local skills exist
- what to read before changing code

## Read Order

Start in this order:

1. Read `AGENTS.md`.
2. Read the relevant files in `.ai-rules/`.
3. Read the relevant docs in `node_modules/next/dist/docs/` before changing Next.js behavior.

## Instruction Priority

When instructions conflict, use this order:

1. Direct user request
2. `AGENTS.md`
3. `.ai-rules/*.md`
4. Official framework and library documentation

## Project Rule Files

Project architecture and coding rules live in `.ai-rules/`.

Current rule files:
- `.ai-rules/nextjs-fullstack-project-rules.md`
- `.ai-rules/nextjs-runtime-and-boundaries-rules.md`
- `.ai-rules/react-client-state-and-forms-rules.md`
- `.ai-rules/git-commit-rules.md`

How to use them:
- Read `.ai-rules/nextjs-fullstack-project-rules.md` first for the repository's stable architecture rules and file organization conventions.
- Read `.ai-rules/nextjs-runtime-and-boundaries-rules.md` for data fetching, API route usage, and server/client boundary rules.
- Read `.ai-rules/react-client-state-and-forms-rules.md` when the task touches client-side state, custom hooks, form handling, or validation schemas.
- Read `.ai-rules/git-commit-rules.md` before staging or committing changes.
- Treat `.ai-rules` as the source of truth for implementation rules.
- Do not restate those rules in `AGENTS.md`; update the rule file instead.

## Project Organization

Agents should follow the actual repository structure and the conventions defined in `.ai-rules`.

Primary directory responsibilities:
- `app/` for routes, layouts, pages, and optional `app/api/**/route.ts` files
- `components/` for reusable UI
- `server/` for server-only business logic grouped by domain
- `lib/` for lightweight shared helpers such as `cn` and other generic utilities
- `shared/` for cross-runtime shared types, schemas, constants, and utilities that are intentionally reused by both server and client

These are responsibility anchors, not a complete or fixed directory list.

New directories such as `hooks/`, `types/`, or `styles/` may be added as the project evolves without requiring `AGENTS.md` updates, as long as they do not conflict with the architectural rules in `.ai-rules/`.

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
- `ahooks`
- `next-best-practices`
- `next-cache-components`
- `nextjs-app-router-patterns`
- `vercel-react-best-practices`
- `vercel-composition-patterns`
- `shadcn`
- `react-components`
- `tailwindcss-advanced-layouts`
- `tailwindcss-animations`
- `tanstack-form`
- `better-auth-best-practices`
- `drizzle-orm`
- `zod`

How to use skills:
- Match the task to the relevant skill.
- Read that skill's `SKILL.md` before implementing.
- Use the smallest relevant set of skills for the task.

Typical mapping:
- Next.js app/router work: `next-best-practices`, `nextjs-app-router-patterns`
- client-side hook utilities and event/timer helpers: `ahooks`
- caching work: `next-cache-components`
- UI/component work: `shadcn`, `react-components`, `tailwindcss-advanced-layouts`, `tailwindcss-animations`
- React performance/composition work: `vercel-react-best-practices`, `vercel-composition-patterns`
- headless client-side forms: `tanstack-form`
- type-safe validated forms: `tanstack-form`, `zod`
- auth work: `better-auth-best-practices`
- data layer work: `drizzle-orm`
- validation work: `zod`

## Installed App Dependencies

The current application codebase includes these implementation-level dependencies:

- `@tanstack/react-form`
- `ahooks`
- `zod`

Usage notes:
- Treat installed dependencies as available building blocks, not automatic defaults.
- Follow `.ai-rules/react-client-state-and-forms-rules.md` before introducing them into new code.
- Do not assume `@tanstack/zod-form-adapter` is installed; verify `package.json` before generating adapter-based schema integration or add the dependency in the same change.

## Editing Rule

Before editing code:
- identify the umbrella rule file and any relevant topic rule file in `.ai-rules`
- identify whether a local skill applies
- identify whether official Next.js docs or MCP runtime inspection is needed

If a rule changes, update the rule document in `.ai-rules`, not `AGENTS.md`, unless the entry workflow itself has changed.
