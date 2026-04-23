import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NOTE_LIST_LIMIT_MAX } from '@/server/lib/config/constants'
import { listNotesPage } from '@/server/services/notes/notes.query'

const mocks = vi.hoisted(() => ({
  selectMock: vi.fn(),
  fromMock: vi.fn(),
  whereMock: vi.fn(),
  orderByMock: vi.fn(),
  limitMock: vi.fn(),
  toNoteListItemMock: vi.fn(),
}))

vi.mock('@/server/lib/db', () => ({
  db: {
    select: mocks.selectMock,
  },
}))

vi.mock('@/server/services/notes/notes.schema', () => ({
  notes: {
    id: Symbol('id'),
    userId: Symbol('userId'),
    lifecycleStatus: Symbol('lifecycleStatus'),
    createdAt: Symbol('createdAt'),
  },
}))

vi.mock('@/server/services/notes/notes.mapper', () => ({
  toNoteListItem: mocks.toNoteListItemMock,
}))

describe('notes.query', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.selectMock.mockReturnValue({ from: mocks.fromMock })
    mocks.fromMock.mockReturnValue({ where: mocks.whereMock })
    mocks.whereMock.mockReturnValue({ orderBy: mocks.orderByMock })
    mocks.orderByMock.mockReturnValue({ limit: mocks.limitMock })
    mocks.limitMock.mockResolvedValue([])
    mocks.toNoteListItemMock.mockImplementation((row) => ({ ...row }))
  })

  it('clamps page size and returns page info', async () => {
    mocks.limitMock.mockResolvedValue([
      { id: 'note_1', createdAt: new Date('2026-04-23T10:00:00.000Z') },
      { id: 'note_2', createdAt: new Date('2026-04-22T10:00:00.000Z') },
    ])

    const result = await listNotesPage({ userId: 'u1', pageSize: NOTE_LIST_LIMIT_MAX + 20 })

    expect(mocks.limitMock).toHaveBeenCalledWith(NOTE_LIST_LIMIT_MAX + 1)
    expect(result.pageInfo.pageSize).toBe(NOTE_LIST_LIMIT_MAX)
    expect(result.pageInfo.hasNextPage).toBe(false)
    expect(result.pageInfo.nextCursor).toBeNull()
    expect(result.items).toHaveLength(2)
  })
})
