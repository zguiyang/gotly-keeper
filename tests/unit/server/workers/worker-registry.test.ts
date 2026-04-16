import { describe, expect, it } from 'vitest'

import { selectWorkerRunners, workerRunners } from '@/server/workers/worker-registry'

describe('worker-registry', () => {
  it('returns all workers when WORKERS is empty', () => {
    expect(selectWorkerRunners(undefined)).toEqual(workerRunners)
    expect(selectWorkerRunners('   ')).toEqual(workerRunners)
  })

  it('returns selected worker by name', () => {
    const selected = selectWorkerRunners('bookmark-enrich')
    expect(selected.map((runner) => runner.name)).toEqual(['bookmark-enrich'])
  })

  it('returns empty when worker name does not exist', () => {
    const selected = selectWorkerRunners('unknown-worker')
    expect(selected).toEqual([])
  })
})

