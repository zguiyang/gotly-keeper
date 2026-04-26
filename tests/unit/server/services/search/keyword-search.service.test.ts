import { beforeEach, describe, expect, it, vi } from 'vitest'

import { searchByKeyword } from '@/server/services/search/keyword-search.service'

const mocks = vi.hoisted(() => ({
  selectMock: vi.fn(),
  fromMock: vi.fn(),
  whereMock: vi.fn(),
  orderByMock: vi.fn(),
  limitMock: vi.fn(),
}))

vi.mock('@/server/lib/db', () => ({
  db: {
    select: mocks.selectMock,
  },
}))

vi.mock('@/server/lib/db/schema', () => ({
  bookmarks: {
    id: 'id',
    userId: 'user_id',
    originalText: 'original_text',
    title: 'title',
    note: 'note',
    summary: 'summary',
    bookmarkMeta: 'bookmark_meta',
    url: 'url',
    lifecycleStatus: 'lifecycle_status',
    createdAt: 'created_at',
  },
  notes: {
    userId: 'user_id',
    lifecycleStatus: 'lifecycle_status',
    createdAt: 'created_at',
  },
  todos: {
    userId: 'user_id',
    lifecycleStatus: 'lifecycle_status',
    completedAt: 'completed_at',
    dueAt: 'due_at',
    createdAt: 'created_at',
  },
}))

describe('keyword-search.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.selectMock.mockReturnValue({ from: mocks.fromMock })
    mocks.fromMock.mockReturnValue({ where: mocks.whereMock })
    mocks.whereMock.mockReturnValue({ orderBy: mocks.orderByMock })
    mocks.orderByMock.mockReturnValue({ limit: mocks.limitMock })
    mocks.limitMock.mockImplementation(() =>
      Promise.resolve([
        {
          id: 'bookmark_1',
          originalText: 'https://www.starbucks.com.cn/',
          title: null,
          note: null,
          summary: '木曜日咖啡上新竞品参考，重点看首屏卖点和价格露出。',
          bookmarkMeta: null,
          url: 'https://www.starbucks.com.cn/',
          createdAt: new Date('2026-04-26T08:00:00.000Z'),
        },
      ])
    )
  })

  it('scores bookmark summary text for keyword retrieval', async () => {
    const results = await searchByKeyword({
      userId: 'user_1',
      terms: ['木曜日咖啡', '竞品参考'],
      typeHint: 'link',
      completionHint: null,
      includeArchived: false,
      timeRangeHint: null,
    })

    expect(results).toHaveLength(1)
    expect(results[0]?.asset.type).toBe('link')
    expect(results[0]?.score).toBeGreaterThan(0)
  })
})
