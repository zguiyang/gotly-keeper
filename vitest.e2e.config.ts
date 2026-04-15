import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  plugins: [tsconfigPaths()],
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