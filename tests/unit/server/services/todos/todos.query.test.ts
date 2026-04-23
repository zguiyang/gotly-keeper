import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TODO_LIST_LIMIT_MAX } from '@/server/lib/config/constants'
import {
  listIncompleteTodos,
  listTodoDateMarkers,
  listTodos,
  listTodosByDueDate,
  listTodosPage,
  listUnscheduledTodos,
} from '@/server/services/todos/todos.query'

const mocks = vi.hoisted(() => ({
  selectMock: vi.fn(),
  fromMock: vi.fn(),
  whereMock: vi.fn(),
  orderByMock: vi.fn(),
  limitMock: vi.fn(),
  selectFieldsMock: vi.fn(),
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
    lifecycleStatus: Symbol('lifecycleStatus'),
  },
}))

vi.mock('@/server/services/todos/todos.mapper', () => ({
  toTodoListItem: mocks.toTodoListItemMock,
}))

describe('todos.query', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.selectMock.mockReturnValue({ from: mocks.fromMock })
    mocks.selectFieldsMock.mockReturnValue({ from: mocks.fromMock })
    mocks.fromMock.mockReturnValue({ where: mocks.whereMock })
    mocks.whereMock.mockReturnValue({ orderBy: mocks.orderByMock })
    mocks.orderByMock.mockReturnValue({ limit: mocks.limitMock })
    mocks.limitMock.mockResolvedValue([])
    mocks.toTodoListItemMock.mockImplementation((row) => ({ ...row }))
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

  it('returns paginated todos with page info', async () => {
    mocks.limitMock.mockResolvedValue([
      { id: 'todo_1', createdAt: new Date('2026-04-23T10:00:00.000Z') },
      { id: 'todo_2', createdAt: new Date('2026-04-22T10:00:00.000Z') },
    ])

    const result = await listTodosPage({ userId: 'u1', pageSize: 1 })

    expect(mocks.limitMock).toHaveBeenCalledWith(2)
    expect(result.pageInfo.pageSize).toBe(1)
    expect(result.pageInfo.hasNextPage).toBe(true)
    expect(result.items).toHaveLength(1)
  })

  it('lists todos by due date range', async () => {
    mocks.orderByMock.mockResolvedValue([
      { id: 'todo_1', dueAt: new Date('2026-04-23T08:00:00.000Z') },
      { id: 'todo_2', dueAt: new Date('2026-04-23T10:00:00.000Z') },
    ])

    const result = await listTodosByDueDate({
      userId: 'u1',
      startsAt: new Date('2026-04-23T00:00:00.000Z'),
      endsAt: new Date('2026-04-24T00:00:00.000Z'),
    })

    expect(mocks.orderByMock).toHaveBeenCalled()
    expect(result).toHaveLength(2)
  })

  it('deduplicates todo date markers', async () => {
    mocks.selectMock.mockReturnValueOnce({ from: mocks.fromMock })
    mocks.fromMock.mockReturnValueOnce({ where: mocks.whereMock })
    mocks.whereMock.mockResolvedValue([
      { dueAt: new Date('2026-04-23T08:00:00.000Z') },
      { dueAt: new Date('2026-04-23T10:00:00.000Z') },
      { dueAt: new Date('2026-04-24T08:00:00.000Z') },
    ])

    const result = await listTodoDateMarkers({
      userId: 'u1',
      startsAt: new Date('2026-04-23T00:00:00.000Z'),
      endsAt: new Date('2026-04-25T00:00:00.000Z'),
    })

    expect(result).toEqual(['2026-04-23', '2026-04-24'])
  })

  it('lists unscheduled todos', async () => {
    mocks.limitMock.mockResolvedValue([{ id: 'todo_1' }])

    const result = await listUnscheduledTodos({ userId: 'u1', limit: 3 })

    expect(mocks.limitMock).toHaveBeenCalledWith(3)
    expect(result).toEqual([{ id: 'todo_1' }])
  })
})
