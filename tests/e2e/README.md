# E2E Tests

Browser-level end-to-end tests using Vitest with Playwright provider.

## Setup

```bash
pnpm install
pnpm exec playwright install --with-deps chromium
```

## Running Tests

```bash
pnpm test:e2e
```

## Writing Tests

Place test files in this directory with `*.test.ts` or `*.spec.ts` suffix.

Example:

```typescript
import { test, expect } from '@vitest/browser-playwright'

test('homepage loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Gotly/)
})
```

## Configuration

See `vitest.config.ts` for E2E project configuration.