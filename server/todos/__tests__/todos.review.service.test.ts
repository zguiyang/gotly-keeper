import assert from 'node:assert/strict'
import test from 'node:test'

import { buildTodoReviewPromptInput } from '../todos.review.service'

test('buildTodoReviewPromptInput transforms todos correctly', () => {
  const todos = [
    {
      id: 'todo-1',
      originalText: '完成报告',
      title: '完成报告',
      excerpt: '完成报告',
      type: 'todo' as const,
      url: null,
      timeText: '明天',
      dueAt: new Date('2026-04-15T06:00:00.000Z'),
      completed: false,
      createdAt: new Date('2026-04-13T02:00:00.000Z'),
    },
  ]

  const result = buildTodoReviewPromptInput(todos)

  assert.equal(result.length, 1)
  assert.equal(result[0].id, 'todo-1')
  assert.equal(result[0].text, '完成报告')
  assert.equal(result[0].timeText, '明天')
})
