# Tests

This directory contains the test infrastructure for the Gotly AI project.

## Structure

```
tests/
├── setup/                # Test setup files
│   ├── node.setup.ts     # Node.js environment setup
│   └── test-alias.ts     # server-only test alias mock
├── unit/                 # Unit tests
└── integration/          # Integration tests
```

## Vitest Setup

- Default environment: `node`

## Running Tests

```bash
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:coverage
```

## Setup Files

- `test-alias.ts` - Mocks `server-only` imports in test runtime
- `node.setup.ts` - Sets up Node.js test environment variables

## Notes

- Legacy `server/**/__tests__` is excluded from Vitest run
- End-to-end validation follows a mixed model:
  - AI-driven browser flow execution (spec-driven) is the default for daily flow checks
  - A small scripted E2E smoke suite remains required for CI/release-critical paths
- Source of truth for this policy: `.ai-rules/testing-and-integration-rules.md` (Section 14)
