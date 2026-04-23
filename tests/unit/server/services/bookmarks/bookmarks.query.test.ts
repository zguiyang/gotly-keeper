import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BOOKMARK_LIST_LIMIT_MAX } from '@/server/lib/config/constants'
import { listBookmarksPage } from '@/server/services/bookmarks/bookmarks.query'

const mocks = vi.hoisted(() => ({
  selectMock: vi.fn(),
  fromMock: vi.fn(),
  whereMock: vi.fn(),
  orderByMock: vi.fn(),
  limitMock: vi.fn(),
  toBookmarkListItemMock: vi.fn(),
}))

vi.mock('@/server/lib/db', () => ({
  db: {
    select: mocks.selectMock,
  },
}))

vi.mock('@/server/services/bookmarks/bookmarks.schema', () => ({
  bookmarks: {
    id: Symbol('id'),
    userId: Symbol('userId'),
    lifecycleStatus: Symbol('lifecycleStatus'),
    createdAt: Symbol('createdAt'),
  },
}))

vi.mock('@/server/services/bookmarks/bookmarks.mapper', () => ({
  toBookmarkListItem: mocks.toBookmarkListItemMock,
}))

describe('bookmarks.query', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.selectMock.mockReturnValue({ from: mocks.fromMock })
    mocks.fromMock.mockReturnValue({ where: mocks.whereMock })
    mocks.whereMock.mockReturnValue({ orderBy: mocks.orderByMock })
    mocks.orderByMock.mockReturnValue({ limit: mocks.limitMock })
    mocks.limitMock.mockResolvedValue([])
    mocks.toBookmarkListItemMock.mockImplementation((row) => ({ ...row }))
  })

  it('clamps page size and returns page info', async () => {
    mocks.limitMock.mockResolvedValue([
      { id: 'bookmark_1', createdAt: new Date('2026-04-23T10:00:00.000Z') },
      { id: 'bookmark_2', createdAt: new Date('2026-04-22T10:00:00.000Z') },
    ])

    const result = await listBookmarksPage({ userId: 'u1', pageSize: BOOKMARK_LIST_LIMIT_MAX + 20 })

    expect(mocks.limitMock).toHaveBeenCalledWith(BOOKMARK_LIST_LIMIT_MAX + 1)
    expect(result.pageInfo.pageSize).toBe(BOOKMARK_LIST_LIMIT_MAX)
    expect(result.pageInfo.hasNextPage).toBe(false)
    expect(result.pageInfo.nextCursor).toBeNull()
    expect(result.items).toHaveLength(2)
  })
})
