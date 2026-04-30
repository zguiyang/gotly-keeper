import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchCurrentWorkspaceRun } from '@/client/workspace/workspace-run-events.client'

describe('fetchCurrentWorkspaceRun', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('requests the current run endpoint without cache', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true, run: null }),
    })

    global.fetch = fetchMock as typeof fetch

    await fetchCurrentWorkspaceRun()

    expect(fetchMock).toHaveBeenCalledWith('/api/workspace/runs/current', {
      method: 'GET',
      headers: {
        accept: 'application/json',
      },
      cache: 'no-store',
    })
  })
})
