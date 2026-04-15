import { defineConfig, configDefaults } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const serverOnlyEmptyModule = path.resolve(
  __dirname,
  'node_modules/next/dist/compiled/server-only/empty.js'
)

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      '@': path.resolve(__dirname, '.'),
      'server-only': serverOnlyEmptyModule,
    },
  },
  test: {
    passWithNoTests: true,
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      ...configDefaults.exclude,
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      'tests/e2e/**',
      'server/**/__tests__/*.test.ts',
      'shared/**/__tests__/*.test.ts',
      'components/**/__tests__/*.test.ts',
    ],
    environment: 'node',
    environmentMatchGlobs: [['tests/unit/components/**', 'jsdom']],
    setupFiles: ['./tests/setup/test-alias.ts', './tests/setup/node.setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['tests/**/*'],
      exclude: ['**/__tests__/**', '**/*.d.ts', '**/*.mock.ts', 'node_modules/**'],
    },
  },
})
