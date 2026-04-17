import { describe, expect, it } from 'vitest'

import { toTodoListItem } from '@/server/services/todos/todos.mapper'

describe('todos.mapper', () => {
  it('maps todo row to TodoListItem', () => {
    const createdAt = new Date('2026-04-17T00:00:00.000Z')
    const updatedAt = new Date('2026-04-17T01:00:00.000Z')
    const completedAt = new Date('2026-04-17T02:00:00.000Z')
    const row = {
      id: 'todo_1',
      originalText: 'abcdefghijklmnopqrstuvwxyz1234567890',
      timeText: '明天上午',
      dueAt: new Date('2026-04-18T01:00:00.000Z'),
      completedAt,
      createdAt,
      updatedAt,
    }

    const result = toTodoListItem(row)

    expect(result.id).toBe('todo_1')
    expect(result.title).toBe('abcdefghijklmnopqrstuvwxyz123456')
    expect(result.excerpt).toBe(row.originalText)
    expect(result.completed).toBe(true)
    expect(result.completedAt).toBe(completedAt)
    expect(result.createdAt).toBe(createdAt)
    expect(result.updatedAt).toBe(updatedAt)
  })

  it('maps incomplete todo as completed=false', () => {
    const row = {
      id: 'todo_2',
      originalText: 'short text',
      timeText: null,
      dueAt: null,
      completedAt: null,
      createdAt: new Date('2026-04-17T00:00:00.000Z'),
      updatedAt: new Date('2026-04-17T01:00:00.000Z'),
    }

    const result = toTodoListItem(row)

    expect(result.completed).toBe(false)
    expect(result.title).toBe('short text')
  })
})
