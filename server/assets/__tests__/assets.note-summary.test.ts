import assert from 'node:assert/strict'
import test from 'node:test'

import { buildNoteSummaryPromptInput } from '@/server/notes/notes.summary.service'

test('buildNoteSummaryPromptInput keeps bounded note records', () => {
  const input = buildNoteSummaryPromptInput([
    {
      id: 'note-1',
      originalText: '关于定价的想法：先验证单人用户愿不愿意每天记录。',
      title: '关于定价的想法：先验证单人用户愿不愿意每天记录。',
      excerpt: '关于定价的想法：先验证单人用户愿不愿意每天记录。',
      type: 'note',
      url: null,
      timeText: null,
      dueAt: null,
      completed: false,
      createdAt: new Date('2026-04-13T02:00:00.000Z'),
    },
  ])

  assert.equal(input.length, 1)
  assert.deepEqual(Object.keys(input[0]).sort(), [
    'createdAt',
    'id',
    'text',
  ])
  assert.equal(input[0].text, '关于定价的想法：先验证单人用户愿不愿意每天记录。')
})