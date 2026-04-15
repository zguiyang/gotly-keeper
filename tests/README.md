# Tests

This directory contains the test infrastructure for the Gotly AI project.

## Structure

```
tests/
├── setup/                # Test setup files
│   ├── node.setup.ts     # Node.js environment setup
│   ├── jsdom.setup.ts    # JSDOM helper setup
│   └── test-alias.ts     # server-only test alias mock
├── unit/                 # Unit tests
├── integration/          # Integration tests
└── e2e/                  # Browser E2E tests (separate config)
```

## Vitest Setup

- Default environment: `node`
- Component tests under `tests/unit/components/**` use `jsdom`
- E2E tests use `vitest.e2e.config.ts`

## Running Tests

```bash
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm test:coverage
```

## Setup Files

- `test-alias.ts` - Mocks `server-only` imports in test runtime
- `node.setup.ts` - Sets up Node.js test environment variables
- `jsdom.setup.ts` - Sets up JSDOM environment with React Testing Library cleanup

## Notes

- Legacy `server/**/__tests__` is excluded from Vitest run
