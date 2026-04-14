# Testing and Integration Rules

## 1. Scope

These rules define how AI agents should plan and grow automated testing in this repository.

Use this file when the task touches:

- test strategy
- integration testing
- end-to-end testing
- component testing
- test directory structure
- test environment design
- test data isolation

## 2. Current Project Stage Rule

This repository is still early in its server-side and infrastructure maturity.

Rules:

1. Do not introduce a large or overly abstract test architecture before the product and server domains exist.
2. Prefer a staged testing strategy that can grow with the codebase.
3. Add testing infrastructure only when the corresponding application layer exists and has meaningful behavior to protect.
4. Keep testing decisions proportional to current repository complexity.

## 3. Default Testing Strategy

The default strategy for this repository is:

1. end-to-end tests first
2. service-layer integration tests second
3. targeted client component tests third

This order is intentional.

Rules:

1. Use browser-level tests to protect core user journeys first.
2. Add integration tests as server-side domain logic grows into `server/`.
3. Add component tests only for interactive or behavior-heavy Client Components.
4. Do not chase broad coverage metrics by testing low-value presentational details.

## 4. End-to-End Testing Rule

End-to-end testing is the preferred first layer for meaningful application protection.

Recommended tool:

- Playwright

Good fits:

- auth flows
- page access and navigation
- form submission outcomes
- validation feedback visible to users
- route protection behavior
- loading, error, and redirect behavior

Rules:

1. Prefer testing user-visible behavior over implementation details.
2. Prefer resilient user-facing locators such as role, label, text, or explicit test ids.
3. Keep tests isolated from one another.
4. Do not make one E2E test depend on state created by another test unless the suite explicitly owns that setup.
5. Avoid testing third-party sites or services directly when the product does not control them.

## 5. Next.js App Router Testing Rule

This repository uses modern Next.js App Router behavior.

Rules:

1. Prefer E2E coverage for async Server Component behavior and route-level rendering flows.
2. Do not force unit tests around framework behavior that is better validated through real rendering and navigation.
3. Keep route files thin and test domain logic below the route layer when possible.
4. When pages render data from server-side logic, prefer testing the underlying server behavior directly in service-layer tests instead of routing internal page data through HTTP just for testability.

### 5.1 Next.js Runtime Debugging Preference

For debugging and manual verification of Next.js behavior, prefer the real running application over custom scripts.

Rules:

1. Use browser-backed verification as the first choice for user flows, route rendering, Server Actions, hydration behavior, console errors, and network-visible failures.
2. Use Next.js runtime diagnostics as supporting evidence when they clarify what the browser shows.
3. Avoid writing ad hoc scripts to simulate Next.js behavior when a real page interaction can verify the same claim.
4. Script-level verification is appropriate when the subject is a pure JavaScript utility, a database migration check, or a delivered CLI/maintenance script such as a seed or backfill command.

## 6. Service-Layer Integration Testing Rule

Integration tests become important once business logic grows in `server/`.

Preferred scope:

- `server/<domain>/`
- domain services
- persistence orchestration
- cache behavior
- transactions
- authorization-sensitive business rules

Rules:

1. Test domain behavior at the service entry point, not through unrelated UI layers.
2. Prefer real infrastructure for integration tests when the behavior depends on database or Redis semantics.
3. Keep infrastructure clients on the server side only.
4. Do not create internal API routes only to make server logic easier to test.
5. When server logic is still trivial or absent, defer integration test scaffolding until there is meaningful domain behavior to protect.

## 7. Component Testing Rule

Component tests are allowed, but they are not the first priority in this repository.

Good fits:

- interactive Client Components
- complex form behavior
- non-trivial local state transitions
- accessibility-sensitive interactions

Lower-value fits:

- simple shells
- purely presentational wrappers
- static layout-only components

Rules:

1. Prefer component tests for behavior-heavy Client Components only.
2. Avoid brittle assertions on CSS classes, DOM nesting, or styling details unless those details are part of the required behavior.
3. Keep component tests focused on user-observable outcomes.

## 8. Test Placement Rule

Preferred placement:

- `e2e/` for browser-level end-to-end tests
- `server/<domain>/__tests__/` for service-layer integration tests
- colocated component test files or focused test folders for interactive components when needed

Rules:

1. Keep test placement aligned with the architecture defined in `.ai-rules/nextjs-fullstack-project-rules.md`.
2. Prefer testing `server/` modules directly once that layer exists.
3. Do not centralize unrelated domain tests into one large generic test directory when domain-local placement is clearer.

## 9. Test Data and Environment Isolation Rule

Automated tests must control their own state.

Rules:

1. Keep test data isolated per test or per test file.
2. Prefer rollback, cleanup, or dedicated seed ownership over relying on shared mutable data.
3. Namespace Redis keys used in tests.
4. Do not rely on manually prepared local state that a test cannot reproduce.
5. If a test uses PostgreSQL or Redis behavior, design it so failures can be debugged from owned test setup and teardown.

## 10. Adoption Rule

When introducing automated testing to this repository:

1. start with a minimal runnable slice
2. cover the highest-risk user flow first
3. add scripts and CI steps only when the underlying tests exist
4. expand by domain and risk, not by blanket template generation

Recommended early path:

1. add Playwright when the team is ready to protect real flows
2. write a small auth-focused E2E smoke suite
3. add service-layer integration tests after `server/` domains and infrastructure orchestration exist
4. add component tests selectively for complex Client Components

## 11. AI Implementation Checklist

Before adding or changing tests:

1. confirm which layer is actually being protected: route flow, component behavior, or domain behavior
2. confirm whether E2E would provide more confidence than a lower-level test
3. confirm whether the tested behavior belongs in `app/`, `components/`, or `server/`
4. confirm whether real infrastructure is required for the integration being tested
5. keep the testing surface minimal and aligned with the current stage of the project

## 12. Phase 6 Test Architecture Upgrade (2026-04-14)

### 12.1 Test Layer Structure

This repository now follows a three-layer test architecture:

| Layer | Location | Purpose |
|-------|----------|---------|
| Domain | `server/<domain>/__tests__/*.test.ts` | Unit tests for domain services |
| Application | `server/application/<domain>/__tests__/*.test.ts` | Integration tests for use-cases |
| Action Contract | `server/actions/__tests__/*.test.ts`, `app/**/__tests__/*.test.ts` | Server action contract tests |

### 12.2 Test Infrastructure

Shared test utilities are located at `server/test-utils/`:

```
server/test-utils/
├── factories/       # Data factory functions (asset.factory.ts, user.factory.ts)
├── mocks/           # Mock implementations (ai-runner.mock.ts, search-service.mock.ts)
├── setup/           # Test setup utilities (test-clock.ts)
└── README.md        # Usage conventions
```

### 12.3 Running Tests

Use `pnpm` scripts for running tests:

```bash
pnpm run test:domain      # Run domain layer tests
pnpm run test:application # Run application layer tests
pnpm run test:actions     # Run action contract tests
pnpm run test:critical    # Run all critical tests
```

Tests require the `server-only` alias workaround:

```bash
node --require ./scripts/register-server-only-alias.cjs --import tsx --test <test-files>
```

### 12.4 Test Fixtures and Mocks Rules

**Required:**
- All shared fixtures go in `server/test-utils/factories/`
- All shared mocks go in `server/test-utils/mocks/`
- New domain tests must use factory fixtures instead of inline objects

**Forbidden:**
- Copying fixtures between domains
- Creating domain-specific mocks that duplicate `test-utils/` mocks
- Hardcoding test data instead of using factories

### 12.5 Exit Criteria for New Features

New features must include:

1. Domain unit tests (happy path + 1 failure/degradation branch)
2. Integration tests for application-layer use-cases
3. Action contract tests for server actions
4. Updated `test:critical` coverage

### 12.6 Test Minimum Contract (Enforced)

Every new feature MUST include minimum contract tests based on which layers it touches:

| Layer Touched | Minimum Test Requirement |
|---------------|-------------------------|
| `domain` only | 1 domain unit test (happy path) |
| `application` | +1 application integration test |
| `app/actions` | +1 action contract test |
| `infra` (DB/Redis) | +1 integration test with real infra |

**Rule**: Tests must be added in the same PR as the feature they test.

## 13. Worktree Execution Protocol

When executing phase plans:

1. **Preflight**: Verify dependencies (Phase 5 merged to main)
2. **Worktree**: Create isolated worktree with `feat/<phase-id>` branch
3. **Start Gate**: Verify branch baseline includes `origin/main`
4. **Baseline**: Record existing test state
5. **Sync Gate**: Rebase on `origin/main` before merge
6. **Merge**: PR-only merge to `main` (no direct merge)
