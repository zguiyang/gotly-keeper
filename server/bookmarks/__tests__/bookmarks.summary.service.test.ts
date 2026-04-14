import assert from 'node:assert/strict'
import test from 'node:test'

import { buildBookmarkSummaryPromptInput } from '../bookmarks.summary.service'

test('buildBookmarkSummaryPromptInput transforms bookmarks correctly', () => {
  const bookmarks = [
    {
      id: 'link-1',
      originalText: '收藏 https://example.com',
      title: '收藏',
      excerpt: '收藏 https://example.com',
      type: 'link' as const,
      url: 'https://example.com',
      timeText: null,
      dueAt: null,
      completed: false,
      createdAt: new Date('2026-04-14T02:00:00.000Z'),
    },
  ]

  const result = buildBookmarkSummaryPromptInput(bookmarks)

  assert.equal(result.length, 1)
  assert.equal(result[0].id, 'link-1')
  assert.equal(result[0].url, 'https://example.com')
})
