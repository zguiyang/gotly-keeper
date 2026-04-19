import { describe, expect, it } from 'vitest'

import { toBookmarkListItem } from '@/server/services/bookmarks/bookmarks.mapper'

describe('bookmarks.mapper', () => {
  it('prefers structured title and excerpt fields', () => {
    const result = toBookmarkListItem({
      id: 'bookmark_1',
      originalText: 'original raw input',
      title: 'Structured title',
      note: 'Structured note',
      summary: 'Structured summary',
      url: 'https://example.com',
      bookmarkMeta: {
        status: 'success',
        title: 'Meta title',
        icon: null,
        bookmarkType: null,
        description: 'Meta description',
        contentSummary: 'Meta summary',
        errorCode: null,
        errorMessage: null,
        updatedAt: '2026-04-17T00:00:00.000Z',
      },
      createdAt: new Date('2026-04-17T00:00:00.000Z'),
      updatedAt: new Date('2026-04-17T01:00:00.000Z'),
    })

    expect(result.title).toBe('Structured title')
    expect(result.excerpt).toBe('Structured note')
  })

  it('falls back to summary and bookmark meta when structured fields are missing', () => {
    const result = toBookmarkListItem({
      id: 'bookmark_2',
      originalText: 'original raw input',
      title: null,
      note: null,
      summary: 'Structured summary',
      url: 'https://example.com',
      bookmarkMeta: {
        status: 'success',
        title: 'Meta title',
        icon: null,
        bookmarkType: null,
        description: 'Meta description',
        contentSummary: 'Meta summary',
        errorCode: null,
        errorMessage: null,
        updatedAt: '2026-04-17T00:00:00.000Z',
      },
      createdAt: new Date('2026-04-17T00:00:00.000Z'),
      updatedAt: new Date('2026-04-17T01:00:00.000Z'),
    })

    expect(result.title).toBe('Meta title')
    expect(result.excerpt).toBe('Structured summary')
  })
})
