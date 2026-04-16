import 'server-only'

import { runBookmarkEnrichRunner } from './bookmark-enrich.runner'

export type WorkerRunner = {
  name: string
  start: () => Promise<never>
}

export const workerRunners: WorkerRunner[] = [
  {
    name: 'bookmark-enrich',
    start: runBookmarkEnrichRunner,
  },
]

export function selectWorkerRunners(workersEnv?: string): WorkerRunner[] {
  if (!workersEnv || !workersEnv.trim()) {
    return workerRunners
  }

  const selectedNames = new Set(
    workersEnv
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
  )

  return workerRunners.filter((runner) => selectedNames.has(runner.name))
}

