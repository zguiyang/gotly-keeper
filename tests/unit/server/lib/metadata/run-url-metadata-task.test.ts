import { beforeEach, describe, expect, it, vi } from 'vitest'

import { runUrlMetadataTask } from '@/server/lib/metadata/run-url-metadata-task'

const mocks = vi.hoisted(() => ({
  fetchUrlMetadata: vi.fn(),
}))

vi.mock('@/server/lib/metadata/fetch-url-metadata', () => ({
  fetchUrlMetadata: mocks.fetchUrlMetadata,
}))

describe('runUrlMetadataTask', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchUrlMetadata.mockResolvedValue({
      finalUrl: 'https://example.com/final',
      title: 'Example title',
      icon: 'https://example.com/favicon.ico',
      description: 'Example description',
    })
  })

  it('returns metadata fetched by the pure metadata capability', async () => {
    const result = await runUrlMetadataTask({
      taskId: 'task_1',
      url: 'https://example.com',
      traceId: 'trace_1',
      createdAt: '2026-04-27T00:00:00.000Z',
    })

    expect(result).toMatchObject({
      success: true,
      data: {
        finalUrl: 'https://example.com/final',
        title: 'Example title',
        icon: 'https://example.com/favicon.ico',
        description: 'Example description',
      },
    })
  })

  it('maps fetch failures into task errors', async () => {
    mocks.fetchUrlMetadata.mockRejectedValueOnce(new Error('PRIVATE_URL_BLOCKED'))

    const result = await runUrlMetadataTask({
      taskId: 'task_1',
      url: 'https://example.com',
      traceId: 'trace_1',
      createdAt: '2026-04-27T00:00:00.000Z',
    })

    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'PRIVATE_URL_BLOCKED',
      },
    })
  })
})
