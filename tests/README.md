# Tests

This directory contains the test infrastructure for the Gotly AI project.

## Structure

```
tests/
├── setup/              # Test setup files
│   ├── node.setup.ts   # Node.js environment setup
│   ├── jsdom.setup.ts  # JSDOM environment setup (React components)
│   └── test-alias.ts   # Module alias registration (server-only, etc.)
└── integration/         # Integration tests
```

## Vitest Workspaces

The project uses Vitest with multiple workspaces:

| Workspace | Environment | Purpose | Test Patterns |
|-----------|-------------|---------|---------------|
| `unit-node` | Node.js | Server-side logic, shared utilities | `server/**/__tests__/*.test.ts`, `shared/**/__tests__/*.test.ts` |
| `unit-jsdom` | JSDOM | React components, UI logic | `components/**/__tests__/*.test.ts` |
| `integration` | Node.js | End-to-end integration tests | `tests/integration/**/*.test.ts` |

## Running Tests

```bash
# Run all workspaces
pnpm vitest --run

# Run specific workspace
pnpm vitest --run --workspace unit-node
pnpm vitest --run --workspace unit-jsdom

# Run with UI
pnpm vitest --ui

# Run with coverage
pnpm vitest --run --coverage
```

## Setup Files

- `test-alias.ts` - Registers module aliases, particularly `server-only` which maps to Next.js's empty module
- `node.setup.ts` - Sets up Node.js test environment variables
- `jsdom.setup.ts` - Sets up JSDOM environment with React Testing Library cleanup

## Notes

- Tests in `server/**/__tests__/` use the `server-only` alias to allow importing server-only modules in tests
- Component tests use `@testing-library/react` with JSDOM environment
- All tests run with `passWithNoTests: true` to allow empty test suites
