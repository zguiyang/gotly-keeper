import { defineConfig, configDefaults } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
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
