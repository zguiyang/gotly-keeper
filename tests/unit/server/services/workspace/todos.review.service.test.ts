import { describe, it, expect } from 'vitest'

import type { AssetListItem } from '@/shared/assets/assets.types'

import { buildTodoReviewPromptInput } from '@/server/modules/workspace/todos.review'

describe('todos.review.service', () => {
  describe('buildTodoReviewPromptInput', () => {
    it('transforms todos correctly', () => {
      const todos: AssetListItem[] = [
        {
          id: 'todo-1',
          originalText: '完成报告',
          title: '完成报告',
          excerpt: '完成报告',
          type: 'todo',
          url: null,
          timeText: '明天',
          dueAt: new Date('2026-04-15T06:00:00.000Z'),
          completed: false,
          createdAt: new Date('2026-04-13T02:00:00.000Z'),
        },
      ]

      const result = buildTodoReviewPromptInput(todos)

      expect(result.length).toBe(1)
      expect(result[0].id).toBe('todo-1')
      expect(result[0].text).toBe('完成报告')
      expect(result[0].timeText).toBe('明天')
      expect(result[0].dueAt).toBe('2026-04-15T06:00:00.000Z')
    })

    it('handles null timeText and dueAt', () => {
      const todos: AssetListItem[] = [
        {
          id: 'todo-1',
          originalText: '完成报告',
          title: '完成报告',
          excerpt: '完成报告',
          type: 'todo',
          url: null,
          timeText: null,
          dueAt: null,
          completed: false,
          createdAt: new Date('2026-04-13T02:00:00.000Z'),
        },
      ]

      const result = buildTodoReviewPromptInput(todos)

      expect(result[0].timeText).toBe(null)
      expect(result[0].dueAt).toBe(null)
    })

    it('respects TODO_REVIEW_LIMIT', () => {
      const todos: AssetListItem[] = Array.from({ length: 15 }, (_, i) => ({
        id: `todo-${i}`,
        originalText: `待办 ${i}`,
        title: `待办 ${i}`,
        excerpt: `摘要 ${i}`,
        type: 'todo' as const,
        url: null,
        timeText: null,
        dueAt: null,
        completed: false,
        createdAt: new Date(),
      }))

      const result = buildTodoReviewPromptInput(todos)

      expect(result.length).toBeLessThanOrEqual(10)
    })
  })
})
