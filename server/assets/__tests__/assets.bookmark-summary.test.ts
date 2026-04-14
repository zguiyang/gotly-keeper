import assert from 'node:assert/strict'
import test from 'node:test'

import { buildBookmarkSummaryPromptInput } from '@/server/bookmarks/bookmarks.summary.service'

test('buildBookmarkSummaryPromptInput keeps bounded bookmark records', () => {
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

  assert.equal(input.length, 1)
  assert.deepEqual(Object.keys(input[0]).sort(), [
    'createdAt',
    'id',
    'text',
    'url',
  ])
  assert.equal(input[0].text, '收藏这篇 AI 产品定价文章 https://example.com/pricing')
  assert.equal(input[0].url, 'https://example.com/pricing')
})

test('buildBookmarkSummaryPromptInput limits bookmark records', () => {
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

  assert.equal(input.length, 10)
  assert.equal(input.at(-1)?.id, 'link-9')
})