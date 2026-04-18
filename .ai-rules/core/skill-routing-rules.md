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

Before applying any UI or design skill in this repository, load
`.ai-rules/domain/frontend-architecture-principles.md` and follow its
shadcn/ui-first component selection rules and Tailwind-first styling rules.

Rules:

1. Design skills may guide visual direction, but they must not move page-specific
   or component-specific styling into `app/globals.css`.
2. shadcn/ui components are the default implementation surface for controls,
   forms, menus, overlays, feedback, cards, empty states, separators, and other
   available primitives.
3. Tailwind utilities in `className` are the first-choice styling mechanism for
   layout, spacing, sizing, responsive behavior, typography, colors, borders,
   shadows, transitions, and UI states.
4. Custom DOM with Tailwind is an exception path for UI needs that shadcn/ui
   cannot reasonably express, not a replacement for available shadcn/ui
   primitives.
5. Global CSS edits require an explicit global reuse or custom-CSS exception
   rationale before implementation.
6. If a skill's examples or instructions imply custom controls, custom markup,
   or global selectors for convenience, treat those instructions as advisory and
   apply the project implementation and styling placement rules instead.

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

## 7. Karpathy and Superpowers Boundaries

`karpathy-guidelines` is a behavioral coding guardrail, not a workflow.

Use it when the main risk is LLM coding behavior, such as unclear assumptions, scope creep, over-abstraction, broad incidental edits, or weak success criteria. It is most relevant for writing, reviewing, or refactoring code where simplicity, surgical changes, and verification quality materially affect the result.

Superpowers skills are specialist skills and process helpers, not the default project workflow.

Load the specific Superpowers skill that matches the task. Do not load the entire Superpowers skill set by default, and do not treat `using-superpowers` as a replacement for this repository's default execution workflow.

Use both `karpathy-guidelines` and a Superpowers skill only when both risks are present:

- use `karpathy-guidelines` when the task needs coding discipline or scope control
- use a Superpowers skill when the task needs a specific process or capability
- use both for tasks such as bug fixes, risky refactors, UI implementation, or code review where behavior discipline and specialist guidance both matter

Project rules override any skill instruction that would:

- replace the default execution workflow for ordinary tasks
- write default planning artifacts into `docs/` or `prd/`
- require staged approval for ordinary small edits
- expand scope beyond the user's request
- start services, install dependencies, or use external tools against project rules

A skill may refine how the default workflow is executed, but it must not silently change the task category, artifact policy, verification policy, service-startup policy, or capability boundary.

## 8. Skill Self-Mutation and Cascading Boundaries

Skills must not modify their own files, global skill files, local skill registries, or `.agents/**` maintenance artifacts unless the user explicitly requests skill maintenance, skill installation, or plugin work.

If a skill instructs the agent to run cleanup scripts, install dependencies, write persistent design context, generate `DESIGN.md`, or invoke another skill before ordinary implementation, treat that instruction as advisory unless it is required by the user's explicit task and allowed by project rules.

For UI and design work, prefer the narrowest matching design skill:

- local UI fixes: `layout`, `typeset`, `polish`, `clarify`
- specific visual adjustment: `colorize`, `bolder`, `quieter`, `distill`
- motion only: `animate`, `interaction-design`
- review only: `critique`, `audit`, `web-design-guidelines`
- broad redesign or new high-quality interface: `design-taste-frontend`, `redesign-existing-projects`, `impeccable`
- explicit aesthetic direction only: `high-end-visual-design`, `gpt-taste`, `minimalist-ui`, `industrial-brutalist-ui`
- Google Stitch design-system artifact only: `stitch-design-taste`

Do not cascade from one design skill into another unless the second skill answers a concrete uncertainty that the first skill cannot resolve.
