import { beforeEach, describe, expect, it, vi } from 'vitest'

import { updateNote } from '@/server/services/notes/notes.mutation'

const fixedNow = new Date('2026-04-19T00:00:00.000Z')

const mocks = vi.hoisted(() => ({
  updateMock: vi.fn(),
  setMock: vi.fn(),
  whereMock: vi.fn(),
  returningMock: vi.fn(),
  toNoteListItemMock: vi.fn(),
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

vi.mock('@/server/services/notes/notes.schema', () => ({
  notes: {
    id: Symbol('id'),
    userId: Symbol('userId'),
    lifecycleStatus: Symbol('lifecycleStatus'),
  },
}))

vi.mock('@/server/services/notes/notes.mapper', () => ({
  toNoteListItem: mocks.toNoteListItemMock,
}))

describe('notes.mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.updateMock.mockReturnValue({ set: mocks.setMock })
    mocks.setMock.mockReturnValue({ where: mocks.whereMock })
    mocks.whereMock.mockReturnValue({ returning: mocks.returningMock })
    mocks.returningMock.mockResolvedValue([])
    mocks.toNoteListItemMock.mockImplementation((row) => ({ id: row.id }))
    mocks.nowMock.mockReturnValue(fixedNow)
  })

  it('returns null when note is not found', async () => {
    const result = await updateNote({ userId: 'u1', noteId: 'note_1', text: '更新后的内容' })

    expect(result).toBeNull()
  })

  it('updates structured note fields and returns mapped row', async () => {
    mocks.returningMock.mockResolvedValue([{ id: 'note_1' }])

    const result = await updateNote({
      userId: 'u1',
      noteId: 'note_1',
      rawInput: '  更新后的会议纪要  ',
      title: '新纪要标题',
      content: '补充联调风险和 blocker',
      summary: '联调继续推进，先解决鉴权回调问题。',
    })

    expect(mocks.setMock).toHaveBeenCalledWith({
      originalText: '更新后的会议纪要',
      title: '新纪要标题',
      content: '补充联调风险和 blocker',
      summary: '联调继续推进，先解决鉴权回调问题。',
      updatedAt: fixedNow,
    })
    expect(mocks.toNoteListItemMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ id: 'note_1' })
  })

  it('clears structured note fields for legacy text updates', async () => {
    mocks.returningMock.mockResolvedValue([{ id: 'note_1' }])

    await updateNote({ userId: 'u1', noteId: 'note_1', text: '  仅保留原始文本  ' })

    expect(mocks.setMock).toHaveBeenCalledWith({
      originalText: '仅保留原始文本',
      title: null,
      content: null,
      summary: null,
      updatedAt: fixedNow,
    })
  })

  it('keeps omitted structured note fields unchanged for rawInput updates', async () => {
    mocks.returningMock.mockResolvedValue([{ id: 'note_1' }])

    await updateNote({
      userId: 'u1',
      noteId: 'note_1',
      rawInput: '  保留已有结构化字段  ',
    })

    expect(mocks.setMock).toHaveBeenCalledWith({
      originalText: '保留已有结构化字段',
      title: undefined,
      content: undefined,
      summary: undefined,
      updatedAt: fixedNow,
    })
  })

  it('throws EMPTY_INPUT when rawInput is empty after trim', async () => {
    await expect(
      updateNote({
        userId: 'u1',
        noteId: 'note_1',
        rawInput: '   ',
        title: '新纪要标题',
      })
    ).rejects.toThrow('EMPTY_INPUT')

    expect(mocks.updateMock).not.toHaveBeenCalled()
  })
})
