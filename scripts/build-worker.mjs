import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

let build

try {
  ;({ build } = await import('esbuild'))
} catch (error) {
  console.error(
    '[worker:build] missing dev dependency "esbuild". Run "pnpm install" to restore full local dependencies before starting the worker.'
  )
  throw error
}

await build({
  absWorkingDir: rootDir,
  entryPoints: ['scripts/run-workers.ts'],
  outfile: 'dist-workers/run-workers.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  sourcemap: false,
  tsconfig: 'tsconfig.json',
  alias: {
    'server-only': path.join(rootDir, 'scripts/empty-server-only.js'),
  },
})
