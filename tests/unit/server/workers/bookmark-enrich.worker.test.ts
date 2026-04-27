import { beforeEach, describe, expect, it, vi } from 'vitest'

import { runBookmarkEnrichWorker } from '@/server/workers/bookmark-enrich.worker'

const mocks = vi.hoisted(() => ({
  buildWorkspaceSystemPrompt: vi.fn(),
  checkUrlSafety: vi.fn(),
  runAiGeneration: vi.fn(),
}))

vi.mock('@/server/lib/ai', () => ({
  buildWorkspaceSystemPrompt: mocks.buildWorkspaceSystemPrompt,
  runAiGeneration: mocks.runAiGeneration,
}))

vi.mock('@/server/services/bookmark/url-safety', () => ({
  checkUrlSafety: mocks.checkUrlSafety,
}))

describe('runBookmarkEnrichWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.checkUrlSafety.mockResolvedValue({ safe: true })
    mocks.buildWorkspaceSystemPrompt.mockResolvedValue('system prompt')
    mocks.runAiGeneration.mockResolvedValue({
      success: true,
      data: {
        contentSummary: '摘要',
      },
    })
  })

  it('re-checks url safety before fetching the page', async () => {
    mocks.checkUrlSafety.mockResolvedValueOnce({
      safe: false,
      reason: 'private_network',
    })
    const fetchMock = vi.spyOn(globalThis, 'fetch')

    const result = await runBookmarkEnrichWorker({
      taskId: 'task_1',
      bookmarkId: 'bookmark_1',
      userId: 'user_1',
      url: 'https://example.com',
      traceId: 'trace_1',
      createdAt: '2026-04-27T00:00:00.000Z',
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'PRIVATE_URL_BLOCKED',
      },
    })
  })

  it('rejects oversized html responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html>' + 'a'.repeat(300_000) + '</html>', {
        status: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
        },
      })
    )

    const result = await runBookmarkEnrichWorker({
      taskId: 'task_1',
      bookmarkId: 'bookmark_1',
      userId: 'user_1',
      url: 'https://example.com',
      traceId: 'trace_1',
      createdAt: '2026-04-27T00:00:00.000Z',
    })

    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'FETCH_TOO_LARGE',
      },
    })
  })
})
