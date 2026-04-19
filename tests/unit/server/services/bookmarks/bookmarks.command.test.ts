import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createBookmark } from '@/server/services/bookmarks/bookmarks.command'

const mocks = vi.hoisted(() => ({
  insertMock: vi.fn(),
  valuesMock: vi.fn(),
  returningMock: vi.fn(),
  toBookmarkListItemMock: vi.fn(),
}))

vi.mock('@/server/lib/db', () => ({
  db: {
    insert: mocks.insertMock,
  },
}))

vi.mock('@/server/services/bookmarks/bookmarks.schema', () => ({
  bookmarks: Symbol('bookmarks'),
}))

vi.mock('@/server/services/bookmarks/bookmarks.mapper', () => ({
  toBookmarkListItem: mocks.toBookmarkListItemMock,
}))

describe('bookmarks.command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.insertMock.mockReturnValue({ values: mocks.valuesMock })
    mocks.valuesMock.mockReturnValue({ returning: mocks.returningMock })
    mocks.returningMock.mockResolvedValue([{ id: 'bookmark_1', originalText: 'link text' }])
    mocks.toBookmarkListItemMock.mockReturnValue({ id: 'bookmark_1', title: 'link text' })
  })

  it('trims input and returns mapped bookmark', async () => {
    const result = await createBookmark({
      userId: 'u1',
      rawInput: '  link text  ',
      url: ' https://example.com ',
      title: '  Example title  ',
      note: '  Example note  ',
      summary: '  Example summary  ',
    })

    expect(mocks.valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        originalText: 'link text',
        title: 'Example title',
        note: 'Example note',
        summary: 'Example summary',
        url: 'https://example.com',
      })
    )
    expect(mocks.toBookmarkListItemMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ id: 'bookmark_1', title: 'link text' })
  })

  it('stores empty structured fields as null', async () => {
    await createBookmark({
      userId: 'u1',
      rawInput: '  link text  ',
      url: 'https://example.com',
      title: '   ',
      note: '',
      summary: ' ',
    })

    expect(mocks.valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: null,
        note: null,
        summary: null,
      })
    )
  })

  it('throws EMPTY_INPUT before URL validation', async () => {
    await expect(createBookmark({ userId: 'u1', rawInput: '   ', url: '' })).rejects.toThrow('EMPTY_INPUT')
    expect(mocks.insertMock).not.toHaveBeenCalled()
  })

  it('throws URL_REQUIRED when url is missing', async () => {
    await expect(createBookmark({ userId: 'u1', rawInput: 'link text', url: '' })).rejects.toThrow(
      'URL_REQUIRED'
    )
    expect(mocks.insertMock).not.toHaveBeenCalled()
  })

  it('throws URL_REQUIRED when url is only spaces', async () => {
    await expect(createBookmark({ userId: 'u1', rawInput: 'link text', url: '   ' })).rejects.toThrow('URL_REQUIRED')
    expect(mocks.insertMock).not.toHaveBeenCalled()
  })
})
