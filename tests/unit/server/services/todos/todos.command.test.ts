import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTodo } from '@/server/services/todos/todos.command'

const mocks = vi.hoisted(() => ({
  insertMock: vi.fn(),
  valuesMock: vi.fn(),
  returningMock: vi.fn(),
  toTodoListItemMock: vi.fn(),
}))

vi.mock('@/server/lib/db', () => ({
  db: {
    insert: mocks.insertMock,
  },
}))

vi.mock('@/server/services/todos/todos.schema', () => ({
  todos: Symbol('todos'),
}))

vi.mock('@/server/services/todos/todos.mapper', () => ({
  toTodoListItem: mocks.toTodoListItemMock,
}))

describe('todos.command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.insertMock.mockReturnValue({ values: mocks.valuesMock })
    mocks.valuesMock.mockReturnValue({ returning: mocks.returningMock })
    mocks.returningMock.mockResolvedValue([{ id: 'todo_1', originalText: 'task' }])
    mocks.toTodoListItemMock.mockReturnValue({ id: 'todo_1', title: 'task' })
  })

  it('trims input and returns mapped todo', async () => {
    const result = await createTodo({ userId: 'u1', text: '  task  ' })

    expect(mocks.valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        originalText: 'task',
      })
    )
    expect(mocks.toTodoListItemMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ id: 'todo_1', title: 'task' })
  })

  it('throws EMPTY_INPUT when text is empty after trim', async () => {
    await expect(createTodo({ userId: 'u1', text: '   ' })).rejects.toThrow('EMPTY_INPUT')
    expect(mocks.insertMock).not.toHaveBeenCalled()
  })
})
