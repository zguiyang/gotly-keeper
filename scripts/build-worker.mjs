import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { build } from 'esbuild'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

await build({
  absWorkingDir: rootDir,
  entryPoints: ['scripts/run-workers.ts'],
  outfile: 'dist-workers/run-workers.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  sourcemap: false,
  packages: 'external',
  tsconfig: 'tsconfig.json',
  alias: {
    'server-only': path.join(rootDir, 'scripts/empty-server-only.js'),
  },
})
