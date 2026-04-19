# Project Tooling and Runtime Rules

## 1. Scope

These rules define how AI agents should install dependencies, run project commands, inspect running pages, and choose between local skills, MCP services, and external documentation sources.

Use this file when the task touches:

- dependency installation or removal
- project scripts and local command execution
- starting or checking local services
- browser-based page inspection
- implementation and review workflows that require skills, MCP services, tools, or package/framework documentation
- written proposal, planning, or execution-plan artifacts

## 1.1 Development Session Bootstrap Rule

`ai-bootstrap-check` is a governance/worktree preflight, not the default gate for every ordinary code edit.

Run `bash .ai-rules/advanced-workflows/scripts/ai-bootstrap-check.sh` only when one of these applies:

1. The task is explicitly marked as phase, subagent, parallel, or worktree execution.
2. The task changes `AGENTS.md`, `.ai-rules/**`, `.agents/**`, `docs/**`, `prd/**`, or local AI workflow artifacts.
3. The user explicitly asks for a bootstrap/governance preflight.

Rules:

1. For ordinary `small-edit`, `feature/refactor`, and `debug` tasks, follow `.ai-rules/core/default-execution-workflow.md` and do not run `ai-bootstrap-check` as a mandatory start gate.
2. For phase/parallel development, create workspace only via:
   `bash .ai-rules/advanced-workflows/scripts/create-ai-worktree.sh <phase_id> [branch_type]`.
3. If baseline metadata is missing in an existing phase/worktree workspace, run:
   `bash .ai-rules/advanced-workflows/scripts/ai-bootstrap-check.sh --init-baseline`.
4. If bootstrap fails because current rules differ from latest approved `origin/main` rules, sync with latest `main` before coding.
5. For explicitly approved governance edits, use `--allow-rules-drift` (or `ALLOW_RULE_DRIFT=1`) and record approval context in task/PR notes.

## 2. Package Manager and Command Runner Rule

`pnpm` is the only approved dependency manager and project command runner in this repository.

Rules:

1. Use `pnpm` for installing, removing, or updating dependencies.
2. Use `pnpm` for project scripts such as `dev`, `build`, `lint`, and test commands.
3. Do not use `npm`, `npx`, `yarn`, or `bun` for dependency management or routine project execution.
4. If documentation or a third-party example shows `npm` or `yarn`, translate it to the equivalent `pnpm` command before running it here.

### 2.1 Project Script Execution Environment Rule

Commands that invoke scripts defined in `package.json` should run in the user's local environment, not inside the sandbox.

Rules:

1. Before running a command that invokes a `package.json` script, request non-sandbox/local execution through the available approval mechanism.
2. This applies to root and workspace package scripts, including forms such as `pnpm dev`, `pnpm run dev`, `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm --filter <workspace> <script>`.
3. Do not first try package-script commands in the sandbox when the same command is expected to need the real local environment; avoid avoidable sandbox failures and wait time.
4. This rule covers project scripts only. Read-only inspection commands such as `rg`, `sed`, `git diff`, and `git status` may still use the normal sandboxed execution path when they do not need local-environment access.
5. Dependency installation and removal remain governed by the package manager rule above and any active approval requirements for commands that modify the local environment.

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

### 4.1 Next.js Debugging Verification Preference

When debugging or validating Next.js application behavior, prefer proving the behavior through the actual running page before writing or running custom scripts.

Rules:

1. Use a real browser against the actual page as the first-choice verification path for route behavior, Server Actions, rendered UI state, hydration, console errors, and user-facing flows.
2. Use Next.js DevTools MCP or other runtime diagnostics to support browser verification when they materially improve the diagnosis.
3. Do not write ad hoc scripts to test Next.js behavior when the same claim can be verified through the browser and the running app.
4. Direct script execution is appropriate when the script or CLI is itself the delivered artifact, such as a migration helper, backfill command, seed command, one-off maintenance command, or a pure JavaScript utility whose behavior is independent of Next.js runtime rendering.
5. Static checks such as `pnpm lint`, TypeScript checks, and migration checks remain useful, but they do not replace browser-backed verification for user-visible Next.js behavior.
6. When the target behavior depends on `app/**/actions.ts`, `server/modules/**` orchestration, or a real user-visible business result, prefer real-page browser verification over isolated local tests for final proof.

For verification-method selection, follow `.ai-rules/core/testing-and-integration-rules.md`.

## 5. Need-Based Tool Selection Rule

Skills, MCP services, browser tools, runtime inspection, documentation lookup, shell commands, and other agent tools should be used deliberately, based on the task's risk and uncertainty.

This is a need-based rule, not a no-tool rule. Agents should use available tools when they materially improve correctness, but should not invoke broad tool chains by default when reading the code and local project rules is sufficient.

Rules:

1. Start with the smallest sufficient context: the user's request, relevant diffs, nearby code, and the applicable `.ai-rules` files.
2. Use the smallest relevant set of skills, MCP services, and tools needed to answer or implement the task correctly.
3. Escalate to additional tools when they reduce real uncertainty, such as unclear framework behavior, version-sensitive APIs, runtime-only failures, hydration or server/client boundary issues, browser-visible UI state, CI failures, dependency behavior, or behavior that cannot be verified from code alone.
4. For Next.js behavior, prefer browser-backed verification when the question concerns rendered behavior, Server Actions, hydration, console/runtime errors, network state, or actual page state. Do not replace that verification with ad hoc scripts unless the script itself is the delivered artifact or the behavior is independent of the running app.
5. Do not repeatedly invoke multiple overlapping skills or MCP services when one relevant source gives enough confidence.
6. Do not skip tools when they are necessary for correctness. If the code path is ambiguous, source documentation is version-sensitive, or runtime state is needed, use the appropriate skill, MCP service, or verification tool.
7. For code review, begin with static review of the diff and related code. Use additional tools only when the review question requires them, such as reproducing a failing state, checking framework/runtime behavior, inspecting a rendered page, or validating a non-obvious integration boundary.

## 6. Skill and MCP Usage Order

When tools are needed, follow a consistent selection order.

Rules:

1. Prefer relevant local development skills first.
2. Use MCP services next when they improve runtime verification, framework correctness, browser inspection, or source-backed lookup.
3. If neither local skills nor relevant MCP coverage is sufficient, use Context7 MCP to fetch library/package documentation before implementing.
4. Use skills and MCP together when they complement each other. Do not treat them as mutually exclusive options.

## 7. Documentation Lookup Rule

Before implementing unfamiliar or version-sensitive behavior:

1. Read the relevant local skill when one exists.
2. Use the appropriate MCP service when it gives more reliable or runtime-aware guidance.
3. Use Context7 MCP for package/library documentation when local rules and MCP coverage do not fully answer the question.
4. Prefer source-backed guidance over memory when there is any material risk of drift.

## 8. Planning and Proposal Artifact Rule

Writing plans/reports to repository files is not default behavior.

Rules:

1. For ordinary question/small-edit/feature/debug tasks, keep planning in conversation or ephemeral task context.
2. Create `docs/` or `prd/` artifacts only for cross-session handoff or large feature planning.
3. Follow `.ai-rules/core/project-governance-rules.md` for placement and promotion rules.
4. If the user explicitly requests a durable plan/report file, create it in the correct layer.

## 8.1 Completion, PR, and Merge Readiness Rule

Before creating a PR or merging completed work, agents must prove code readiness. GitHub CLI readiness is required only before GitHub PR operations.

Rules:

1. Run verification appropriate to the changed code before offering or attempting integration.
2. Review the full diff and related code in a code-review stance before local merge or PR fallback.
3. If the review finds blocking correctness, architecture, security, data-loss, or test-coverage issues, stop and tell the user. Do not merge or create a PR until the issues are fixed and review is rerun.
4. Prefer local merge into the base branch first when the active workflow allows direct local integration.
5. If local merge or push fails, stop and ask the user whether to create a PR for fallback merge. Do not create a PR unless the user explicitly approves PR fallback.
6. Before any `gh pr ...` command, run `gh auth status`.
7. If GitHub CLI authentication fails, stop and tell the user that `gh` authentication is unavailable. Ask the user to restore auth with `gh auth login` or another approved auth path before retrying.
8. Do not use PR merge to bypass failed, pending, or unknown PR review/check status.
9. For phase execution, follow the stricter gate order in `.ai-rules/advanced-workflows/phase-execution-protocol.md`.
10. If a global skill or external workflow, including `finishing-a-development-branch`, suggests offering PR creation as a peer option to local merge, that portion is overridden in this repository. Use local merge first, and offer PR fallback only after local merge or push fails.

## 9. Operational Checklist

Before running commands or implementing code:

1. Confirm whether the task touches dependency management, scripts, runtime inspection, or service startup.
2. If yes, read this file alongside the project architecture and boundary rules.
3. If backend/server behavior is touched, read `.ai-rules/domain/backend-architecture-principles.md` first and use it as behavior-boundary baseline.
4. Use `pnpm` for package and script operations.
5. Run `package.json` script commands in the user's local environment through the available approval mechanism instead of trying them in the sandbox first.
6. Do not start services without user approval.
7. Choose tools by need and uncertainty; do not run broad tool chains by default.
8. Prefer skills first, then MCP, then Context7 when additional guidance is needed.
9. For browser work, follow the browser priority order defined in Section 4.
10. For Next.js debugging and validation, prefer actual browser/page verification over custom scripts, except for pure JavaScript utilities or delivered CLI/script artifacts.
11. For test-suite versus browser-verification decisions, follow `.ai-rules/core/testing-and-integration-rules.md`.
12. Follow `.ai-rules/core/project-governance-rules.md` for placement of AI workflow guards and local AI workspace material.
13. Do not treat local AI workspace files as repository deliverables.
14. Run `ai-bootstrap-check` only for the governance/worktree cases listed in Section 1.1.
15. Before commit/PR, run `bash .ai-rules/advanced-workflows/guards/check-rules-integrity.sh --staged`.
16. Before local merge, complete code review as defined in Section 8.1.
17. Before PR creation or PR merge, complete code review and `gh auth status` checks as defined in Section 8.1.

## 10. Guard Scripts

Rule-validation scripts live under `.ai-rules/advanced-workflows/guards/`.

Run guard scripts directly by path. Do not expose `.ai-rules/` guards through `package.json`, even when CI uses them.

Examples:

```bash
bash .ai-rules/advanced-workflows/guards/check-phase-doc-protocol.sh
bash .ai-rules/advanced-workflows/guards/check-import-boundaries.sh
bash .ai-rules/advanced-workflows/guards/check-global-css-placement.sh
bash .ai-rules/advanced-workflows/guards/check-design-token-usage.sh --staged
bash .ai-rules/advanced-workflows/guards/check-governance-links.sh
bash .ai-rules/advanced-workflows/guards/check-rules-integrity.sh --staged
```

Use AI-workflow and architecture guards directly when auditing AI workflow artifacts, CI boundaries, or repository rule compliance.

## 11. Phase Execution Protocol Reference

For all phase plan execution rules (Preflight Gate, Start Gate, Sync Gate, Fail-Fast, local-first merge, and PR fallback), see:

- `.ai-rules/advanced-workflows/phase-execution-protocol.md`
- `.ai-rules/core/project-architecture-rules.md`
