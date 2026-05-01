import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  selectMock: vi.fn(),
  fromMock: vi.fn(),
  whereMock: vi.fn(),
  orderByMock: vi.fn(),
  limitMock: vi.fn(),
  toTodoListItemMock: vi.fn(),
  andMock: vi.fn((...args: unknown[]) => ({ type: 'and', args })),
  orMock: vi.fn((...args: unknown[]) => ({ type: 'or', args })),
  eqMock: vi.fn((left: unknown, right: unknown) => ({ type: 'eq', left, right })),
  isNullMock: vi.fn((value: unknown) => ({ type: 'isNull', value })),
  descMock: vi.fn((value: unknown) => ({ type: 'desc', value })),
}))

vi.mock('drizzle-orm', () => ({
  and: mocks.andMock,
  asc: vi.fn(),
  desc: mocks.descMock,
  eq: mocks.eqMock,
  inArray: vi.fn(),
  isNotNull: vi.fn(),
  isNull: mocks.isNullMock,
  lt: vi.fn(),
  or: mocks.orMock,
  sql: vi.fn(),
}))

vi.mock('@/server/lib/db', () => ({
  db: {
    select: mocks.selectMock,
  },
}))

vi.mock('@/server/services/todos/todos.schema', () => ({
  todos: {
    userId: Symbol('userId'),
    lifecycleStatus: Symbol('lifecycleStatus'),
    title: Symbol('title'),
    originalText: Symbol('originalText'),
    dueAt: Symbol('dueAt'),
    timeText: Symbol('timeText'),
    createdAt: Symbol('createdAt'),
  },
}))

vi.mock('@/server/services/todos/todos.mapper', () => ({
  toTodoListItem: mocks.toTodoListItemMock,
}))

describe('todos duplicate query', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.selectMock.mockReturnValue({ from: mocks.fromMock })
    mocks.fromMock.mockReturnValue({ where: mocks.whereMock })
    mocks.whereMock.mockReturnValue({ orderBy: mocks.orderByMock })
    mocks.orderByMock.mockReturnValue({ limit: mocks.limitMock })
    mocks.limitMock.mockResolvedValue([])
    mocks.toTodoListItemMock.mockImplementation((row) => ({ ...row }))
  })

  it('matches duplicates against title and original text', async () => {
    const { findDuplicateTodos } = await import('@/server/services/todos/todos.query')

    await findDuplicateTodos({
      userId: 'u1',
      title: '给客户发报价',
      dueAt: null,
      timeText: null,
    })

    expect(mocks.orMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'eq', right: '给客户发报价' }),
      expect.objectContaining({ type: 'eq', right: '给客户发报价' })
    )
  })
})
