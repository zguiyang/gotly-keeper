import { describe, it, expect } from 'vitest'

import type { AssetListItem } from '@/shared/assets/assets.types'

import { buildBookmarkSummaryPromptInput } from '@/server/modules/workspace/bookmarks.summary'

describe('bookmarks.summary.service', () => {
  describe('buildBookmarkSummaryPromptInput', () => {
    it('transforms bookmarks correctly', () => {
      const bookmarks: AssetListItem[] = [
        {
          id: 'link-1',
          originalText: '收藏 https://example.com',
          title: '收藏',
          excerpt: '收藏 https://example.com',
          type: 'link',
          url: 'https://example.com',
          timeText: null,
          dueAt: null,
          completed: false,
          createdAt: new Date('2026-04-14T02:00:00.000Z'),
        },
      ]

      const result = buildBookmarkSummaryPromptInput(bookmarks)

      expect(result.length).toBe(1)
      expect(result[0].id).toBe('link-1')
      expect(result[0].url).toBe('https://example.com')
      expect(result[0].text).toBe('收藏 https://example.com')
      expect(result[0].createdAt).toBe('2026-04-14T02:00:00.000Z')
    })

    it('handles null url', () => {
      const bookmarks: AssetListItem[] = [
        {
          id: 'link-1',
          originalText: '书签',
          title: '书签',
          excerpt: '书签',
          type: 'link',
          url: null,
          timeText: null,
          dueAt: null,
          completed: false,
          createdAt: new Date('2026-04-14T02:00:00.000Z'),
        },
      ]

      const result = buildBookmarkSummaryPromptInput(bookmarks)

      expect(result[0].url).toBe(null)
    })

    it('respects BOOKMARK_SUMMARY_LIMIT', () => {
      const bookmarks: AssetListItem[] = Array.from({ length: 15 }, (_, i) => ({
        id: `link-${i}`,
        originalText: `书签 ${i}`,
        title: `书签 ${i}`,
        excerpt: `书签 ${i}`,
        type: 'link' as const,
        url: `https://example.com/${i}`,
        timeText: null,
        dueAt: null,
        completed: false,
        createdAt: new Date(),
      }))

      const result = buildBookmarkSummaryPromptInput(bookmarks)

      expect(result.length).toBeLessThanOrEqual(10)
    })
  })
})
