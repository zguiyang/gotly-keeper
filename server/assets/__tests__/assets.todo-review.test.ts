import assert from 'node:assert/strict'
import test from 'node:test'

import { buildTodoReviewPromptInput } from '../assets.todo-review.pure'

test('buildTodoReviewPromptInput keeps bounded source records', () => {
  const input = buildTodoReviewPromptInput([
    {
      id: 'todo-1',
      originalText: '明天下午记得发报价给客户',
      title: '明天下午记得发报价给客户',
      excerpt: '明天下午记得发报价给客户',
      type: 'todo',
      url: null,
      timeText: '明天下午',
      dueAt: new Date('2026-04-14T06:00:00.000Z'),
      completed: false,
      createdAt: new Date('2026-04-13T02:00:00.000Z'),
    },
  ])

  assert.equal(input.length, 1)
  assert.deepEqual(Object.keys(input[0]).sort(), [
    'createdAt',
    'dueAt',
    'id',
    'text',
    'timeText',
  ])
  assert.equal(input[0].text, '明天下午记得发报价给客户')
})