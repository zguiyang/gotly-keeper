# Project Tooling and Runtime Rules

## 1. Scope

These rules define how AI agents should install dependencies, run project commands, inspect running pages, and choose between local skills, MCP services, and external documentation sources.

Use this file when the task touches:

- dependency installation or removal
- project scripts and local command execution
- starting or checking local services
- browser-based page inspection
- implementation workflows that require skills, MCP services, or package/framework documentation

## 2. Package Manager and Command Runner Rule

`pnpm` is the only approved dependency manager and project command runner in this repository.

Rules:

1. Use `pnpm` for installing, removing, or updating dependencies.
2. Use `pnpm` for project scripts such as `dev`, `build`, `lint`, and test commands.
3. Do not use `npm`, `npx`, `yarn`, or `bun` for dependency management or routine project execution.
4. If documentation or a third-party example shows `npm` or `yarn`, translate it to the equivalent `pnpm` command before running it here.

## 3. Service Startup Permission Rule

Starting local services changes the user's environment and must not happen implicitly.

Rules:

1. Do not start the Next.js dev server, Docker services, databases, Redis, or any other long-running local service without the user's approval.
2. Do not assume an existing service should be restarted just because the task would benefit from it.
3. If a task requires a running service and none is available, ask the user to start it or ask for permission before starting it yourself.
4. If a browser or runtime inspection fails because the target app is not running, tell the user that the service needs to be started instead of silently launching it.

## 4. Page Inspection Rule

When a task requires checking the UI or viewing a page:

1. Prefer browser-based inspection through the available browser tools instead of non-browser shortcuts.
2. Use browser tools in this priority order:
   `agent-browser` skill first, `chrome-devtools` skill second, Playwright MCP or Playwright-related skills last.
3. Use browser inspection to validate the actual rendered page when a service is already running.
4. If the page cannot be opened because the relevant service is not running, tell the user what needs to be started.
5. Do not start the service automatically just to inspect the page unless the user has approved that action.

## 5. Skill and MCP Usage Order

Implementation work should follow a consistent tool-selection order.

Rules:

1. Prefer relevant local development skills first.
2. Use MCP services next when they improve runtime verification, framework correctness, browser inspection, or source-backed lookup.
3. If neither local skills nor relevant MCP coverage is sufficient, use Context7 MCP to fetch library/package documentation before implementing.
4. Use skills and MCP together when they complement each other. Do not treat them as mutually exclusive options.

## 6. Documentation Lookup Rule

Before implementing unfamiliar or version-sensitive behavior:

1. Read the relevant local skill when one exists.
2. Use the appropriate MCP service when it gives more reliable or runtime-aware guidance.
3. Use Context7 MCP for package/library documentation when local rules and MCP coverage do not fully answer the question.
4. Prefer source-backed guidance over memory when there is any material risk of drift.

## 7. Operational Checklist

Before running commands or implementing code:

1. Confirm whether the task touches dependency management, scripts, runtime inspection, or service startup.
2. If yes, read this file alongside the architecture and boundary rules.
3. Use `pnpm` for package and script operations.
4. Do not start services without user approval.
5. Prefer skills first, then MCP, then Context7 when additional guidance is needed.
6. For browser work, follow the browser priority order defined in Section 4.
