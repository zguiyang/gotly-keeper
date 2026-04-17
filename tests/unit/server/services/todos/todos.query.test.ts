import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TODO_LIST_LIMIT_MAX } from '@/server/lib/config/constants'
import { listIncompleteTodos, listTodos } from '@/server/services/todos/todos.query'

const mocks = vi.hoisted(() => ({
  selectMock: vi.fn(),
  fromMock: vi.fn(),
  whereMock: vi.fn(),
  orderByMock: vi.fn(),
  limitMock: vi.fn(),
  toTodoListItemMock: vi.fn(),
}))

vi.mock('@/server/lib/db', () => ({
  db: {
    select: mocks.selectMock,
  },
}))

vi.mock('@/server/services/todos/todos.schema', () => ({
  todos: {
    id: Symbol('id'),
    userId: Symbol('userId'),
    completedAt: Symbol('completedAt'),
    createdAt: Symbol('createdAt'),
    dueAt: Symbol('dueAt'),
  },
}))

vi.mock('@/server/services/todos/todos.mapper', () => ({
  toTodoListItem: mocks.toTodoListItemMock,
}))

describe('todos.query', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.selectMock.mockReturnValue({ from: mocks.fromMock })
    mocks.fromMock.mockReturnValue({ where: mocks.whereMock })
    mocks.whereMock.mockReturnValue({ orderBy: mocks.orderByMock })
    mocks.orderByMock.mockReturnValue({ limit: mocks.limitMock })
    mocks.limitMock.mockResolvedValue([])
    mocks.toTodoListItemMock.mockImplementation((row) => ({ id: row.id }))
  })

  it('clamps listTodos limit to TODO_LIST_LIMIT_MAX', async () => {
    await listTodos({ userId: 'u1', limit: TODO_LIST_LIMIT_MAX + 100 })
    expect(mocks.limitMock).toHaveBeenCalledWith(TODO_LIST_LIMIT_MAX)
  })

  it('maps rows for listIncompleteTodos', async () => {
    mocks.limitMock.mockResolvedValue([{ id: 'todo_1' }])

    const result = await listIncompleteTodos('u1', 5)

    expect(mocks.limitMock).toHaveBeenCalledWith(5)
    expect(mocks.toTodoListItemMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual([{ id: 'todo_1' }])
  })
})
