# Skill Routing Rules

This file defines how agents choose skills without turning skills into workflows.

Use this file only when a task may benefit from a skill or when choosing between skills is uncertain.

## 1. Core Model

A workflow changes the execution contract of the task.

A skill changes the knowledge or tool guidance used inside that execution contract.

Rules:

1. Keep `.ai-rules/core/default-execution-workflow.md` as the default execution harness for ordinary tasks.
2. Do not create a new workflow when a skill route is enough.
3. Do not preload all skills.
4. Load the smallest useful skill set for the user's intent, touched files, and verification needs.
5. If a user explicitly names a skill, use that skill unless it conflicts with higher-priority project rules.

## 2. Selection Order

When a task may need a skill, choose in this order:

1. User-named skill or explicitly requested capability.
2. Project-local skill matching the current stack or touched files.
3. Global specialist skill matching the user's intent.
4. System skill only for platform-level tasks such as image generation, OpenAI documentation, plugin creation, or skill installation.

Default budget:

- ordinary edit: 0-1 skills
- UI/design edit: 1-3 skills
- large redesign: 2-4 skills plus an explicit plan
- debugging: systematic debugging plus the relevant domain skill only when needed
- commit/review: commit or review skill only when explicitly requested

If multiple skills overlap, prefer the narrower skill that answers the current uncertainty.

## 3. UI and Design Routing

For UI work, keep the default execution workflow active and use design skills as overlays.

Use project-local frontend skills first when implementation depends on project stack:

- Next.js behavior or App Router: `next-best-practices`, `nextjs-app-router-patterns`
- Next.js Cache Components: `next-cache-components`
- React component API design: `vercel-composition-patterns`
- React and Next.js performance: `vercel-react-best-practices`
- shadcn/ui components: `shadcn`
- Tailwind layout: `tailwindcss-advanced-layouts`
- Tailwind animation utilities: `tailwindcss-animations`
- icons: `better-icons`
- ahooks usage: `ahooks`
- form state: `tanstack-form`
- schema validation: `zod`

Use global design skills by user intent:

- unclear copy, labels, empty states, or error text: `clarify`
- layout, spacing, alignment, or visual hierarchy: `layout`
- typography, font scale, or readability: `typeset`
- responsive or mobile adaptation: `adapt`
- general UI quality pass: `design-taste-frontend` or `polish`
- existing project redesign: `redesign-existing-projects`
- high-end visual direction: `high-end-visual-design`
- boring or too safe: `bolder`
- lacks color or feels gray: `colorize`
- too loud or visually overwhelming: `quieter`
- simplify or reduce clutter: `distill`
- animation or microinteraction: `animate` or `interaction-design`
- delightful polish: `delight`
- ambitious motion or visual implementation: `overdrive`
- design critique only: `critique`
- accessibility, performance, or theme audit: `audit` or `web-design-guidelines`
- full new visual artifact or page craft: `impeccable`

Do not treat every UI improvement as a new workflow. Create or load an advanced workflow only when the task requires staged approval, durable planning artifacts, cross-session handoff, or explicit multi-agent execution.

## 4. Engineering Routing

Use project-local implementation skills when the touched area matches:

- AI SDK, agents, streaming, or tools: `ai-sdk`
- Better Auth: `better-auth-best-practices`
- Drizzle ORM: `drizzle-orm`
- PostgreSQL query or schema work: `postgres`, `postgres-pro`, `postgresql-table-design`
- pnpm workspace or package behavior: `pnpm`
- tests: `vitest`
- React hook utilities: `ahooks`

Use global engineering skills by task shape:

- bug investigation: `systematic-debugging`
- feature or bugfix with meaningful behavior risk: `test-driven-development`
- surgical cleanup: `refactor`
- code review: `code-reviewer`
- responding to review feedback: `receiving-code-review`
- requesting review before merge: `requesting-code-review`
- Docker or container work: `docker-expert`
- GitHub CLI tasks: `gh-cli`
- committing: `git-commit`
- branch finishing: `finishing-a-development-branch`
- worktree isolation: `using-git-worktrees`

## 5. Planning and Advanced Routing

Do not use planning skills for ordinary edits.

Use planning or advanced skills only when the user asks for planning, cross-session handoff, large feature shaping, or multi-agent execution:

- explore requirements before implementation: `brainstorming`
- write an implementation plan: `writing-plans`
- execute an existing plan: `executing-plans`
- product requirement document: `prd`
- product or design discovery: `product-designer`, `shape`
- parallel independent work: `dispatching-parallel-agents`
- explicit subagent implementation: `subagent-driven-development`
- skill creation or editing: `writing-skills`, `skill-creator`
- installing or discovering skills: `find-skills`, `skill-installer`
- plugin work: `plugin-creator`

Repository rules override any skill instruction that would write default planning artifacts into `docs/` or `prd/` for ordinary tasks.

## 6. External Capability Routing

Use system skills only when their specific capability is needed:

- OpenAI product or API documentation: `openai-docs`
- bitmap image generation or editing: `imagegen`
- creating Codex plugins: `plugin-creator`
- creating Codex skills: `skill-creator`
- installing Codex skills: `skill-installer`

Use browser tools or browser skills only when page rendering, interaction, screenshots, scraping, or visual verification is needed:

- browser automation: `agent-browser`
- Chrome DevTools debugging or performance inspection: `chrome-devtools`

If a task requires browser-backed verification but no relevant service is running, follow `.ai-rules/core/project-tooling-and-runtime-rules.md` before starting or requesting a service.
