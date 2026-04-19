import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setTodoCompletion, updateTodo } from '@/server/services/todos/todos.mutation'

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

  it('updates structured fields when provided', async () => {
    mocks.returningMock.mockResolvedValue([{ id: 'todo_1' }])

    await updateTodo({
      userId: 'u1',
      todoId: 'todo_1',
      rawInput: '  明天提交周报  ',
      title: '提交周报',
      content: '补充本周项目进展和风险',
      timeText: '明天上午',
      dueAt: new Date('2026-04-20T01:00:00.000Z'),
    })

    expect(mocks.setMock).toHaveBeenCalledWith({
      originalText: '明天提交周报',
      title: '提交周报',
      content: '补充本周项目进展和风险',
      timeText: '明天上午',
      dueAt: new Date('2026-04-20T01:00:00.000Z'),
      updatedAt: fixedNow,
    })
  })

  it('clears structured fields for legacy text updates', async () => {
    mocks.returningMock.mockResolvedValue([{ id: 'todo_1' }])

    await updateTodo({
      userId: 'u1',
      todoId: 'todo_1',
      text: '  明天提交周报  ',
    })

    expect(mocks.setMock).toHaveBeenCalledWith({
      originalText: '明天提交周报',
      title: null,
      content: null,
      timeText: null,
      dueAt: null,
      updatedAt: fixedNow,
    })
  })

  it('keeps structured fields unchanged when rawInput omits them', async () => {
    mocks.returningMock.mockResolvedValue([{ id: 'todo_1' }])

    await updateTodo({
      userId: 'u1',
      todoId: 'todo_1',
      rawInput: '  明天提交周报  ',
    })

    expect(mocks.setMock).toHaveBeenCalledWith({
      originalText: '明天提交周报',
      title: undefined,
      content: undefined,
      timeText: undefined,
      dueAt: undefined,
      updatedAt: fixedNow,
    })
  })

  it('allows clearing structured fields with null', async () => {
    mocks.returningMock.mockResolvedValue([{ id: 'todo_1' }])

    await updateTodo({
      userId: 'u1',
      todoId: 'todo_1',
      text: '  明天提交周报  ',
      title: null,
      content: null,
      timeText: null,
      dueAt: null,
    })

    expect(mocks.setMock).toHaveBeenCalledWith({
      originalText: '明天提交周报',
      title: null,
      content: null,
      timeText: null,
      dueAt: null,
      updatedAt: fixedNow,
    })
  })
})
