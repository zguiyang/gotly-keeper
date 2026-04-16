import { describe, it, expect } from 'vitest'

import { buildTodoReviewPromptInput } from '@/server/modules/workspace/todos.review'

describe('assets.todo-review', () => {
  it('buildTodoReviewPromptInput keeps bounded source records', () => {
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

    expect(input.length).toBe(1)
    expect(Object.keys(input[0]).sort()).toEqual([
      'createdAt',
      'dueAt',
      'id',
      'text',
      'timeText',
    ])
    expect(input[0].text).toBe('明天下午记得发报价给客户')
  })
})
