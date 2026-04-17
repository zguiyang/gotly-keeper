import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setTodoCompletion } from '@/server/services/todos/todos.mutation'

const fixedNow = new Date('2026-04-17T00:00:00.000Z')

const mocks = vi.hoisted(() => ({
  updateMock: vi.fn(),
  setMock: vi.fn(),
  whereMock: vi.fn(),
  returningMock: vi.fn(),
  toTodoListItemMock: vi.fn(),
  nowMock: vi.fn(),
}))

vi.mock('@/server/lib/db', () => ({
  db: {
    update: mocks.updateMock,
  },
}))

vi.mock('@/shared/time/dayjs', () => ({
  now: mocks.nowMock,
}))

vi.mock('@/server/services/todos/todos.schema', () => ({
  todos: {
    id: Symbol('id'),
    userId: Symbol('userId'),
  },
}))

vi.mock('@/server/services/todos/todos.mapper', () => ({
  toTodoListItem: mocks.toTodoListItemMock,
}))

describe('todos.mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.updateMock.mockReturnValue({ set: mocks.setMock })
    mocks.setMock.mockReturnValue({ where: mocks.whereMock })
    mocks.whereMock.mockReturnValue({ returning: mocks.returningMock })
    mocks.returningMock.mockResolvedValue([])
    mocks.toTodoListItemMock.mockImplementation((row) => ({ id: row.id }))
    mocks.nowMock.mockReturnValue(fixedNow)
  })

  it('returns null when todo is not found', async () => {
    const result = await setTodoCompletion({ userId: 'u1', todoId: 'todo_1', completed: true })
    expect(result).toBeNull()
  })

  it('updates completedAt/updatedAt and returns mapped row', async () => {
    mocks.returningMock.mockResolvedValue([{ id: 'todo_1' }])

    const result = await setTodoCompletion({ userId: 'u1', todoId: 'todo_1', completed: true })

    expect(mocks.setMock).toHaveBeenCalledWith({
      completedAt: fixedNow,
      updatedAt: fixedNow,
    })
    expect(mocks.toTodoListItemMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ id: 'todo_1' })
  })
})
