# Testing and Verification Rules

## 1. Scope

These rules define how AI agents should choose between test-suite verification and browser-based verification in this repository.

Use this file when the task touches:

- automated tests
- browser-based validation
- server-side logic verification
- component behavior verification
- business-flow validation
- user-visible outcome verification
- test directory structure
- test environment design
- test data isolation

## 2. Core Principle

Choose the verification method based on the goal of the verification, not by habit and not by test-category preference.

The primary distinction is:

- use test suites to verify isolated logic that can be validated reliably without a real page
- use browser-based verification to prove real business outcomes and user-visible results

In short:

- test suites protect local correctness
- browser verification proves real outcomes

AI must first decide what claim needs to be proven before choosing how to verify it.

## 3. Validation Goal Rule

Before adding tests or running verification, identify which of these goals applies:

1. isolated logic correctness
2. local component interaction correctness
3. real business-flow correctness
4. user-visible final outcome correctness

Rules:

1. If the goal is isolated logic correctness, prefer test-suite verification.
2. If the goal is local interaction correctness and the behavior can be validated stably without a real page, prefer test-suite verification.
3. If the goal is to prove a real business flow or final user-visible result, prefer browser-based verification against the real page.
4. Do not treat passing local tests as sufficient proof of a real business outcome when the behavior depends on the full application flow.

## 4. Test Suite Verification Rule

Use test suites for code that can be verified reliably in isolation.

Good fits:

- pure functions
- utility methods
- parsing helpers
- schemas and validators
- service-local logic that does not require proving a full user flow
- server-side helper logic
- `components/ui/*` style UI primitives and generic presentation components
- business components when the verification target is only local interaction behavior

Rules:

1. Prefer test suites when the code can be validated without relying on full page rendering and user flow execution.
2. Prefer test suites for stable regression protection of local logic and bounded interaction behavior.
3. Do not force browser verification for code whose behavior is already well-proven through isolated tests and does not depend on real business-flow completion.
4. Keep test-suite scope focused on local correctness, edge cases, and branch protection.

## 5. Browser Verification Rule

Use browser-based verification when the goal is to prove that the real application flow works from the user's perspective.

Good fits:

- user-triggered business flows
- `app/**/actions.ts`
- `server/modules/**/*.ts` (module-owned use-case orchestration)
- flows that cross page, action, use-case, and domain boundaries
- redirects
- permission-sensitive behavior
- async page feedback
- rendered success/error states
- final UI state after a real interaction
- claims about what the user actually sees or can complete

Rules:

1. Prefer browser verification when the claim involves real business results rather than only local logic.
2. Treat `app/**/actions.ts -> server/modules/** -> server/services/** -> server/lib/**` (and module-owned direct `server/lib/**` boundary integrations) as business-flow infrastructure that should be proven through the real page when validating the final behavior.
3. Use browser verification for changes whose correctness depends on the full request, orchestration, and rendering path.
4. Do not replace browser verification with isolated tests when the task is to prove that the real flow works end to end for the user.

For browser tool and service-startup rules, follow `.ai-rules/core/project-tooling-and-runtime-rules.md`.

## 6. Business Component Rule

Business components are validated according to the target of the verification, not only by their directory location.

Rules:

1. If a business component is being checked for local interaction behavior only, test-suite verification is acceptable.
2. If a business component is being checked for real business outcome correctness, use browser verification.
3. Do not assume that all business components require browser verification.
4. Do not assume that component-level tests alone are sufficient when the component participates in a real business flow.

## 7. Conflict Resolution Rule

When both test-suite verification and browser verification are possible:

1. use test suites for isolated regression protection
2. use browser verification to prove real business outcomes
3. if the main claim is about the user's final result, browser verification wins
4. if the main claim is about isolated local logic, test suites are sufficient

## 8. Test Placement Rule

Preferred placement:

- `tests/e2e/**` for durable browser-level end-to-end tests
- `tests/unit/server/**` for server-side local logic and domain/service verification
- `tests/unit/app/**` for action-contract and boundary-shape tests
- `tests/unit/components/**` for interactive component local behavior verification
- `tests/integration/**` for integration-level verification that is still scriptable and deterministic

Rules:

1. Keep test placement aligned with `.ai-rules/core/project-architecture-rules.md`.
2. Prefer testing `server/` modules directly once that layer exists.
3. Keep all new automated tests under root `tests/` and do not introduce `__tests__/` directories in project source trees.
4. Do not create tests whose only purpose is to mimic a real browser flow badly; use a real browser when the claim is flow-level.

## 9. Test Data and Environment Isolation Rule

Automated tests must control their own state.

Rules:

1. Keep test data isolated per test or per test file.
2. Prefer rollback, cleanup, or dedicated seed ownership over relying on shared mutable data.
3. Namespace Redis keys used in tests.
4. Do not rely on manually prepared local state that a test cannot reproduce.
5. If a test uses PostgreSQL or Redis behavior, design it so failures can be debugged from owned test setup and teardown.

## 10. Adoption Rule

When introducing or expanding verification in this repository:

1. start with the smallest verification surface that proves the important claim
2. use test suites to keep local logic stable
3. use browser verification for final confidence in real business flows
4. add scripts and CI steps only when the underlying verification already exists
5. expand by risk and product value, not by blanket template generation

## 11. Current Test Architecture

### 11.1 Test Layer Structure

This repository currently follows a mixed verification model:

| Verification Target | Typical Location | Purpose |
|-------|----------|---------|
| Domain and server-local logic | `tests/unit/server/**/*.test.ts` | Protect local service and helper behavior |
| Application-local orchestration | `tests/unit/server/**/*.test.ts` | Protect isolated orchestration branches when useful |
| Action or boundary contracts | `tests/unit/app/**/*.test.ts` | Protect boundary shaping and action-facing contracts |
| Real business outcomes | browser-based verification against the running app | Prove real user-visible flow correctness |

### 11.2 Test Infrastructure

Shared test utilities are located at `server/test-utils/`:

```text
server/test-utils/
├── factories/       # Data factory functions (asset.factory.ts, user.factory.ts)
├── mocks/           # Mock implementations (ai-runner.mock.ts, search-service.mock.ts)
├── setup/           # Test setup utilities (test-clock.ts)
└── README.md        # Usage conventions
```

### 11.3 Running Tests

Use `pnpm` scripts for running tests:

```bash
pnpm test              # Run all tests
pnpm test:unit         # Run unit tests under tests/unit
pnpm test:integration  # Run integration tests
pnpm test:watch        # Run tests in watch mode
pnpm test:coverage     # Run tests with coverage
```

These are `package.json` scripts. Follow `.ai-rules/core/project-tooling-and-runtime-rules.md` and run them through the approved local execution path instead of the sandbox-first path.

Vitest is configured via a single config in `vitest.config.ts`, with `tests/**/*.{test,spec}.{ts,tsx}` as include. The test infrastructure is centralized in the `tests/` directory.

### 11.4 Test Fixtures and Mocks Rules

**Required:**
- All shared fixtures go in `server/test-utils/factories/`
- All shared mocks go in `server/test-utils/mocks/`
- New domain tests should use factory fixtures instead of repetitive inline objects when shared fixtures improve clarity

**Forbidden:**
- Copying fixtures between domains
- Creating domain-specific mocks that duplicate `test-utils/` mocks
- Hardcoding shared test data repeatedly when a reusable factory already exists

## 12. AI Decision Checklist

Before choosing a verification path, AI must ask:

1. Am I proving isolated logic or a real business result?
2. Does this behavior depend on `actions.ts`, `use-case.ts`, real rendering, redirects, permissions, or async UI feedback?
3. Can this claim be proven reliably without a real page?
4. Is the target a UI primitive, a local interaction, or a real business flow?

Decision guide:

- isolated logic -> test suite
- generic UI primitive -> test suite
- local business-component interaction -> test suite when isolated verification is enough
- real business-flow outcome -> browser verification

## 13. Related Rules

- Runtime verification and browser priority: `.ai-rules/core/project-tooling-and-runtime-rules.md`
- Architecture and action/use-case boundaries: `.ai-rules/core/project-architecture-rules.md`
- Backend behavior boundaries and test-layer alignment baseline: `.ai-rules/domain/backend-architecture-principles.md`
- Client component and form boundaries: `.ai-rules/domain/react-client-state-and-forms-rules.md`
- Worktree execution protocol: `.ai-rules/advanced-workflows/phase-execution-protocol.md`

## 14. AI-Driven E2E Execution Policy

This repository allows end-to-end verification through AI-driven browser execution (for example, AI operating Playwright-capable browser tools) based on flow specifications instead of hand-written test scripts for every scenario.

The intent is to combine delivery speed with reliable regression protection.

### 14.1 Primary Model

Use a mixed model:

1. AI-driven browser flow execution for most day-to-day end-to-end validation.
2. A small durable scripted E2E smoke suite for release/CI gates.

Do not require engineers to hand-write script-based E2E for every flow when a flow-spec-driven AI execution path is sufficient.

### 14.2 What AI-Driven Flow Execution Is For

AI-driven browser flow execution is the default for:

- exploratory verification of business flows
- fast validation during active development
- scenario variation checks (different roles, data shapes, or edge paths)
- confirming user-visible outcomes on the real page

### 14.3 What Must Stay Scripted

Keep a minimal scripted smoke suite for critical production paths where reproducibility in CI is mandatory.

At minimum, include business-critical gates such as:

- authentication and session continuity
- one core creation/edit flow
- one core read/search/discovery flow
- one high-risk permission/guardrail flow

The exact flows may evolve by product risk, but the smoke suite must stay intentionally small and high-value.

### 14.4 Flow Specification Requirement

When using AI-driven E2E execution, the scenario source of truth must be a written flow specification.

A valid flow specification should define:

1. preconditions (environment, account role, required seed data)
2. ordered user steps
3. expected visible checkpoints
4. failure capture expectations (screenshot, console/network clues, or final error state)

Without a clear flow specification, AI-driven E2E results are not considered stable evidence.

### 14.5 Evidence and Repeatability Rule

AI-driven E2E runs must produce lightweight evidence suitable for review:

- scenario identifier or title
- run timestamp
- pass/fail outcome
- failure artifacts when failed

Passing AI runs are useful confidence signals, but they do not replace the minimal scripted smoke gate required for CI reliability.
