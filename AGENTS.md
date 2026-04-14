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

## Operating Principles

Agents should reason from first principles: start from the user's original need and the underlying problem, not from habit, templates, or framework defaults.

Apply this as follows:
- Do not assume the user already knows exactly what they want. If the goal, motivation, or success criteria are unclear, pause to clarify before changing code.
- If the goal is clear but the requested path is not the shortest or strongest path to that goal, say so directly and propose the better route.
- When something fails, trace the root cause before patching symptoms. Each meaningful decision should be explainable with a clear "why".
- Keep outputs focused on decision-changing information. Remove details that do not affect the next action, tradeoff, or verification result.

## Project Rule Files

Project architecture and coding rules live in `.ai-rules/`.

Current rule files:
- `.ai-rules/nextjs-fullstack-project-rules.md`
- `.ai-rules/nextjs-runtime-and-boundaries-rules.md`
- `.ai-rules/react-client-state-and-forms-rules.md`
- `.ai-rules/project-tooling-and-runtime-rules.md`
- `.ai-rules/testing-and-integration-rules.md`
- `.ai-rules/git-commit-rules.md`
- `.ai-rules/ai-sdk-rules.md`

How to use them:
- Read `.ai-rules/nextjs-fullstack-project-rules.md` first for the repository's stable architecture rules and file organization conventions.
- Read `.ai-rules/nextjs-runtime-and-boundaries-rules.md` for data fetching, API route usage, and server/client boundary rules.
- Read `.ai-rules/react-client-state-and-forms-rules.md` when the task touches client-side state, custom hooks, form handling, or validation schemas.
- Read `.ai-rules/project-tooling-and-runtime-rules.md` when the task touches dependency installation, project commands, service startup, browser inspection, or the order of using skills and MCP tools.
- Read `.ai-rules/testing-and-integration-rules.md` when the task touches test strategy, test structure, end-to-end testing, or integration testing.
- Read `.ai-rules/git-commit-rules.md` before staging or committing changes.
- Read `.ai-rules/ai-sdk-rules.md` when the task touches AI SDK, model calls, agents, AI Gateway, streaming chat, or `@ai-sdk/react`.
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

## Phase Execution Protocol

All phase plans (in `docs/superpowers/plans/`) MUST follow the execution protocol.

Key rules:
- **Preflight Gate**: Verify dependencies before starting
- **Start Gate**: Verify branch baseline
- **Sync Gate**: Rebase on main + lint before merge
- **Fail-Fast**: Any gate failure stops execution immediately
- **PR-only Merge**: No direct merge to main

See `.ai-rules/phase-execution-protocol.md` for full protocol details.

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
- During implementation, prefer relevant local skills first, then MCP services, and then Context7 MCP when additional package or library documentation is still needed.
- For browser-based page inspection, prefer `agent-browser` first, `chrome-devtools` second, and Playwright MCP or Playwright-related skills last.

## Local Skills

Project-local skills live in `.agents/skills/`.

Current skill set:
- `ai-sdk`
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
- `better-icons`
- `drizzle-orm`
- `pnpm`
- `postgres`
- `postgres-pro`
- `postgresql-table-design`
- `vitest`
- `zod`

How to use skills:
- Match the task to the relevant skill.
- Read that skill's `SKILL.md` before implementing.
- Use the smallest relevant set of skills for the task.

Typical mapping:
- AI SDK, AI Gateway, model calls, agents, chatbots, streaming, tool calling, structured output, embeddings, or `useChat`: `ai-sdk`
- Next.js app/router work: `next-best-practices`, `nextjs-app-router-patterns`
- client-side hook utilities and event/timer helpers: `ahooks`
- caching work: `next-cache-components`
- UI/component work: `shadcn`, `react-components`, `tailwindcss-advanced-layouts`, `tailwindcss-animations`
- React performance/composition work: `vercel-react-best-practices`, `vercel-composition-patterns`
- headless client-side forms: `tanstack-form`
- type-safe validated forms: `tanstack-form`, `zod`
- auth work: `better-auth-best-practices`
- icon search and selection: `better-icons`; implement with `lucide-react` first, then SVG fallback when needed
- data layer work: `drizzle-orm`
- PostgreSQL operations and query tuning: `postgres`, `postgres-pro`
- PostgreSQL schema design and review: `postgresql-table-design`
- package manager and workspace command orchestration: `pnpm`
- test authoring, mock strategy, and test execution tuning: `vitest`
- validation work: `zod`

## Installed App Dependencies

The current application codebase includes these implementation-level dependencies:

- `@ai-sdk/react`
- `@tanstack/react-form`
- `ahooks`
- `ai`
- `ioredis`
- `lucide-react`
- `zod`

Usage notes:
- Treat installed dependencies as available building blocks, not automatic defaults.
- Follow `.ai-rules/react-client-state-and-forms-rules.md` before introducing them into new code.
- Follow `.ai-rules/ai-sdk-rules.md` before using `ai`, `@ai-sdk/react`, `AI_GATEWAY_API_KEY`, or `AI_GATEWAY_URL`.
- Treat `AI_GATEWAY_API_KEY` and `AI_GATEWAY_URL` as server-only configuration. Do not expose them through `NEXT_PUBLIC_*` variables or Client Components.
- Treat `ioredis` as a server-only infrastructure dependency. Do not import it into Client Components or other cross-runtime modules.
- Treat `lucide-react` as the default project icon library. Use `better-icons` to search and choose icons, prefer importing matching `lucide-react` icons in application code, and use raw SVG assets only when lucide does not provide a suitable icon or a specific non-lucide asset is required.
- Do not assume `@tanstack/zod-form-adapter` is installed; verify `package.json` before generating adapter-based schema integration or add the dependency in the same change.

## Local Infrastructure

Local development infrastructure is defined in `docker-compose.yml`.

Current local services:
- PostgreSQL 16 on `localhost:5434` with database `gotly_dev`
- Redis 7 on `localhost:6382`

Usage notes:
- Read `docker-compose.yml` before assuming local service names, ports, or credentials.
- Use these services for runtime verification when a task touches persistence, caching, queues, or job orchestration.
- Keep service clients on the server side of the Next.js boundary.

## Editing Rule

Before editing code:
- identify the umbrella rule file and any relevant topic rule file in `.ai-rules`
- identify whether a local skill applies
- identify whether official Next.js docs or MCP runtime inspection is needed
- identify whether `.ai-rules/project-tooling-and-runtime-rules.md` applies to the task

If a rule changes, update the rule document in `.ai-rules`, not `AGENTS.md`, unless the entry workflow itself has changed.
