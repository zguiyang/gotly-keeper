import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  acknowledgeQueueMessage,
  dequeueQueueMessage,
  enqueueQueueMessage,
  releaseQueueMessage,
} from '@/server/services/queue/queue.service'

const mocks = vi.hoisted(() => ({
  lpushMock: vi.fn(),
  brpoplpushMock: vi.fn(),
  lremMock: vi.fn(),
  lpushReleaseMock: vi.fn(),
}))

vi.mock('@/server/lib/cache/redis', () => ({
  redis: {
    lpush: mocks.lpushMock,
    brpoplpush: mocks.brpoplpushMock,
    lrem: mocks.lremMock,
  },
}))

describe('queue.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('enqueues payloads as json strings', async () => {
    await enqueueQueueMessage('bookmark:enrich', { id: 'task_1' })

    expect(mocks.lpushMock).toHaveBeenCalledWith('bookmark:enrich', JSON.stringify({ id: 'task_1' }))
  })

  it('moves dequeued payloads into processing queue until acknowledged', async () => {
    mocks.brpoplpushMock.mockResolvedValue(JSON.stringify({ id: 'task_1' }))

    const reserved = await dequeueQueueMessage<{ id: string }>('bookmark:enrich', 5)

    expect(mocks.brpoplpushMock).toHaveBeenCalledWith(
      'bookmark:enrich',
      'bookmark:enrich:processing',
      5
    )
    expect(reserved).toEqual({
      payload: { id: 'task_1' },
      receipt: {
        queueName: 'bookmark:enrich',
        processingQueueName: 'bookmark:enrich:processing',
        rawPayload: JSON.stringify({ id: 'task_1' }),
      },
    })
  })

  it('acknowledges processed payloads by removing them from processing queue', async () => {
    await acknowledgeQueueMessage({
      queueName: 'bookmark:enrich',
      processingQueueName: 'bookmark:enrich:processing',
      rawPayload: JSON.stringify({ id: 'task_1' }),
    })

    expect(mocks.lremMock).toHaveBeenCalledWith(
      'bookmark:enrich:processing',
      1,
      JSON.stringify({ id: 'task_1' })
    )
  })

  it('releases failed payloads back to the main queue', async () => {
    mocks.lpushMock.mockResolvedValue(undefined)

    await releaseQueueMessage({
      queueName: 'bookmark:enrich',
      processingQueueName: 'bookmark:enrich:processing',
      rawPayload: JSON.stringify({ id: 'task_1' }),
    })

    expect(mocks.lremMock).toHaveBeenCalledWith(
      'bookmark:enrich:processing',
      1,
      JSON.stringify({ id: 'task_1' })
    )
    expect(mocks.lpushMock).toHaveBeenCalledWith('bookmark:enrich', JSON.stringify({ id: 'task_1' }))
  })
})
