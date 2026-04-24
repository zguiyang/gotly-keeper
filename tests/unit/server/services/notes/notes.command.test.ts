import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createNote } from '@/server/services/notes/notes.command'

const mocks = vi.hoisted(() => ({
  insertMock: vi.fn(),
  valuesMock: vi.fn(),
  returningMock: vi.fn(),
  toNoteListItemMock: vi.fn(),
}))

vi.mock('@/server/lib/db', () => ({
  db: {
    insert: mocks.insertMock,
  },
}))

vi.mock('@/server/services/notes/notes.schema', () => ({
  notes: Symbol('notes'),
}))

vi.mock('@/server/services/notes/notes.mapper', () => ({
  toNoteListItem: mocks.toNoteListItemMock,
}))

describe('notes.command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.insertMock.mockReturnValue({ values: mocks.valuesMock })
    mocks.valuesMock.mockReturnValue({ returning: mocks.returningMock })
    mocks.returningMock.mockResolvedValue([{ id: 'note_1', originalText: 'note text' }])
    mocks.toNoteListItemMock.mockReturnValue({ id: 'note_1', title: 'note text' })
  })

  it('preserves note input while validating non-empty content', async () => {
    const result = await createNote({ userId: 'u1', text: '  note text  ' })

    expect(mocks.valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        originalText: '  note text  ',
      })
    )
    expect(mocks.toNoteListItemMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ id: 'note_1', title: 'note text' })
  })

  it('writes structured note fields when provided', async () => {
    await createNote({
      userId: 'u1',
      rawInput: '  这是一条会议纪要  ',
      title: '项目例会纪要',
      content: '确认下周发布节奏与负责人分工',
      summary: '下周一进入联调，周三开始灰度。',
    })

    expect(mocks.valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
         originalText: '  这是一条会议纪要  ',
        title: '项目例会纪要',
        content: '确认下周发布节奏与负责人分工',
        summary: '下周一进入联调，周三开始灰度。',
      })
    )
  })

  it('defaults structured note content to rawInput for legacy-compatible writes', async () => {
    await createNote({
      userId: 'u1',
      rawInput: '  直接保存成轻笔记正文  ',
    })

    expect(mocks.valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        originalText: '  直接保存成轻笔记正文  ',
        content: '  直接保存成轻笔记正文  ',
      })
    )
  })

  it('preserves markdown-significant leading spaces in structured content', async () => {
    await createNote({
      userId: 'u1',
      rawInput: '代码块示例',
      content: '    const answer = 42',
    })

    expect(mocks.valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        content: '    const answer = 42',
      })
    )
  })

  it('throws EMPTY_INPUT when text is empty after trim', async () => {
    await expect(createNote({ userId: 'u1', text: '   ' })).rejects.toThrow('EMPTY_INPUT')
    expect(mocks.insertMock).not.toHaveBeenCalled()
  })

  it('throws EMPTY_INPUT when rawInput is empty after trim', async () => {
    await expect(
      createNote({
        userId: 'u1',
        rawInput: '   ',
        title: '项目例会纪要',
      })
    ).rejects.toThrow('EMPTY_INPUT')
    expect(mocks.insertMock).not.toHaveBeenCalled()
  })
})
