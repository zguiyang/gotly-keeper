import { beforeEach, describe, expect, it, vi } from 'vitest'

import { updateBookmark } from '@/server/services/bookmarks/bookmarks.mutation'

const fixedNow = new Date('2026-04-17T00:00:00.000Z')

const mocks = vi.hoisted(() => ({
  selectMock: vi.fn(),
  fromMock: vi.fn(),
  selectWhereMock: vi.fn(),
  selectLimitMock: vi.fn(),
  updateMock: vi.fn(),
  setMock: vi.fn(),
  updateWhereMock: vi.fn(),
  returningMock: vi.fn(),
  toBookmarkListItemMock: vi.fn(),
  nowMock: vi.fn(),
  nowIsoMock: vi.fn(),
}))

vi.mock('@/server/lib/db', () => ({
  db: {
    select: mocks.selectMock,
    update: mocks.updateMock,
  },
}))

vi.mock('@/shared/time/dayjs', () => ({
  now: mocks.nowMock,
  nowIso: mocks.nowIsoMock,
}))

vi.mock('@/server/services/bookmarks/bookmarks.schema', () => ({
  bookmarks: {
    id: Symbol('id'),
    userId: Symbol('userId'),
    url: Symbol('url'),
    lifecycleStatus: Symbol('lifecycleStatus'),
  },
}))

vi.mock('@/server/services/bookmarks/bookmarks.mapper', () => ({
  toBookmarkListItem: mocks.toBookmarkListItemMock,
}))

describe('bookmarks.mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.selectMock.mockReturnValue({ from: mocks.fromMock })
    mocks.fromMock.mockReturnValue({ where: mocks.selectWhereMock })
    mocks.selectWhereMock.mockReturnValue({ limit: mocks.selectLimitMock })
    mocks.selectLimitMock.mockResolvedValue([{ url: 'https://old.example.com' }])

    mocks.updateMock.mockReturnValue({ set: mocks.setMock })
    mocks.setMock.mockReturnValue({ where: mocks.updateWhereMock })
    mocks.updateWhereMock.mockReturnValue({ returning: mocks.returningMock })
    mocks.returningMock.mockResolvedValue([{ id: 'bookmark_1', originalText: 'raw input' }])

    mocks.toBookmarkListItemMock.mockImplementation((row) => ({ id: row.id }))
    mocks.nowMock.mockReturnValue(fixedNow)
    mocks.nowIsoMock.mockReturnValue('2026-04-17T00:00:00.000Z')
  })

  it('updates structured bookmark fields and reports url change', async () => {
    const result = await updateBookmark({
      userId: 'u1',
      bookmarkId: 'bookmark_1',
      rawInput: '  raw input  ',
      url: ' https://new.example.com ',
      title: '  New title  ',
      note: '  New note  ',
      summary: '  New summary  ',
    })

    expect(mocks.setMock).toHaveBeenCalledWith({
      originalText: 'raw input',
      url: 'https://new.example.com',
      title: 'New title',
      note: 'New note',
      summary: 'New summary',
      bookmarkMeta: {
        status: 'pending',
        title: null,
        icon: null,
        bookmarkType: null,
        description: null,
        contentSummary: null,
        errorCode: null,
        errorMessage: null,
        updatedAt: '2026-04-17T00:00:00.000Z',
      },
      updatedAt: fixedNow,
    })
    expect(result).toEqual({ item: { id: 'bookmark_1' }, urlChanged: true })
  })

  it('stores empty structured fields as null without resetting enrichment when url is unchanged', async () => {
    mocks.selectLimitMock.mockResolvedValue([{ url: 'https://example.com' }])

    await updateBookmark({
      userId: 'u1',
      bookmarkId: 'bookmark_1',
      rawInput: 'raw input',
      url: 'https://example.com',
      title: ' ',
      note: '',
      summary: '   ',
    })

    expect(mocks.setMock).toHaveBeenCalledWith({
      originalText: 'raw input',
      url: 'https://example.com',
      title: null,
      note: null,
      summary: null,
      bookmarkMeta: undefined,
      updatedAt: fixedNow,
    })
  })

  it('clears structured bookmark fields for legacy text/url updates', async () => {
    mocks.selectLimitMock.mockResolvedValue([{ url: 'https://example.com' }])

    await updateBookmark({
      userId: 'u1',
      bookmarkId: 'bookmark_1',
      text: '  raw input  ',
      url: 'https://example.com',
    })

    expect(mocks.setMock).toHaveBeenCalledWith({
      originalText: 'raw input',
      url: 'https://example.com',
      title: null,
      note: null,
      summary: null,
      bookmarkMeta: undefined,
      updatedAt: fixedNow,
    })
  })

  it('keeps omitted structured bookmark fields unchanged for rawInput updates', async () => {
    mocks.selectLimitMock.mockResolvedValue([{ url: 'https://example.com' }])

    await updateBookmark({
      userId: 'u1',
      bookmarkId: 'bookmark_1',
      rawInput: 'raw input',
      url: 'https://example.com',
    })

    expect(mocks.setMock).toHaveBeenCalledWith({
      originalText: 'raw input',
      url: 'https://example.com',
      title: undefined,
      note: undefined,
      summary: undefined,
      bookmarkMeta: undefined,
      updatedAt: fixedNow,
    })
  })
})
