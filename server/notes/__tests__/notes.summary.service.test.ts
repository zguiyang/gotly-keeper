import assert from 'node:assert/strict'
import test from 'node:test'

import { buildNoteSummaryPromptInput } from '../notes.summary.service'

test('buildNoteSummaryPromptInput transforms notes correctly', () => {
  const notes = [
    {
      id: 'note-1',
      originalText: '测试笔记内容',
      title: '测试笔记',
      excerpt: '测试笔记内容',
      type: 'note' as const,
      url: null,
      timeText: null,
      dueAt: null,
      completed: false,
      createdAt: new Date('2026-04-13T02:00:00.000Z'),
    },
  ]

  const result = buildNoteSummaryPromptInput(notes)

  assert.equal(result.length, 1)
  assert.equal(result[0].id, 'note-1')
  assert.equal(result[0].text, '测试笔记内容')
})
