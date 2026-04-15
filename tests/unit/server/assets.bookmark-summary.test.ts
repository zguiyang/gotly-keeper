import { describe, it, expect } from 'vitest'
import { buildBookmarkSummaryPromptInput } from '../../../server/bookmarks/bookmarks.summary.service'

describe('assets.bookmark-summary', () => {
  it('buildBookmarkSummaryPromptInput keeps bounded bookmark records', () => {
    const input = buildBookmarkSummaryPromptInput([
      {
        id: 'link-1',
        originalText: '收藏这篇 AI 产品定价文章 https://example.com/pricing',
        title: '收藏这篇 AI 产品定价文章 https://example.com/pricing',
        excerpt: '收藏这篇 AI 产品定价文章 https://example.com/pricing',
        type: 'link',
        url: 'https://example.com/pricing',
        timeText: null,
        dueAt: null,
        completed: false,
        createdAt: new Date('2026-04-14T02:00:00.000Z'),
      },
    ])

    expect(input.length).toBe(1)
    expect(Object.keys(input[0]).sort()).toEqual([
      'createdAt',
      'id',
      'text',
      'url',
    ])
    expect(input[0].text).toBe('收藏这篇 AI 产品定价文章 https://example.com/pricing')
    expect(input[0].url).toBe('https://example.com/pricing')
  })

  it('buildBookmarkSummaryPromptInput limits bookmark records', () => {
    const bookmarks = Array.from({ length: 12 }, (_, index) => ({
      id: `link-${index}`,
      originalText: `bookmark ${index}`,
      title: `bookmark ${index}`,
      excerpt: `bookmark ${index}`,
      type: 'link' as const,
      url: `https://example.com/${index}`,
      timeText: null,
      dueAt: null,
      completed: false,
      createdAt: new Date('2026-04-14T02:00:00.000Z'),
    }))

    const input = buildBookmarkSummaryPromptInput(bookmarks)

    expect(input.length).toBe(10)
    expect(input.at(-1)?.id).toBe('link-9')
  })
})