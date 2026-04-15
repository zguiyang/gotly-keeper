import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    include: ['tests/e2e/**/*.test.{ts,tsx}'],
    browser: {
      enabled: true,
      instances: [
        {
          browser: 'chromium',
        },
      ],
      provider: playwright({
        browser: 'chromium',
      }),
    },
    setupFiles: ['./tests/setup/test-alias.ts'],
  },
})
