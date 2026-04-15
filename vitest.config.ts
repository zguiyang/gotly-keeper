import { defineConfig, configDefaults } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ['.'], loose: true })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
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
      'server/**/__tests__/*.test.ts',
      'shared/**/__tests__/*.test.ts',
      'components/**/__tests__/*.test.ts',
    ],
    projects: [
      {
        name: 'unit-node',
        test: {
          include: ['tests/**/*.test.ts'],
          environment: 'node',
          setupFiles: [
            './tests/setup/test-alias.ts',
            './tests/setup/node.setup.ts',
          ],
          resolve: {
            alias: {
              '@': path.resolve(__dirname, '.'),
            },
          },
          coverage: {
            provider: 'v8',
            include: ['tests/**/*'],
            exclude: [
              '**/__tests__/**',
              '**/*.d.ts',
              '**/*.mock.ts',
              'node_modules/**',
            ],
          },
        },
      },
      {
        name: 'unit-jsdom',
        test: {
          include: [],
          environment: 'jsdom',
          setupFiles: [
            './tests/setup/test-alias.ts',
            './tests/setup/jsdom.setup.ts',
          ],
        },
      },
      {
        name: 'integration',
        test: {
          include: [],
          environment: 'node',
          setupFiles: ['./tests/setup/test-alias.ts'],
        },
      },
    ],
  },
})
