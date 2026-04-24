import { describe, expect, it } from 'vitest'

import { toNoteListItem } from '@/server/services/notes/notes.mapper'

describe('notes.mapper', () => {
  it('keeps content as the primary note body', () => {
    const result = toNoteListItem({
      id: 'note_1',
      originalText: '原始输入文本',
      title: '结构化标题',
      content: '结构化正文',
      summary: '结构化摘要',
      createdAt: new Date('2026-04-19T00:00:00.000Z'),
      updatedAt: new Date('2026-04-19T00:00:00.000Z'),
    })

    expect(result.title).toBe('结构化标题')
    expect(result.excerpt).toBe('结构化正文')
    expect(result).toMatchObject({
      content: '结构化正文',
      summary: '结构化摘要',
    })
  })

  it('falls back to originalText as note content for legacy rows', () => {
    const result = toNoteListItem({
      id: 'note_2',
      originalText: '原始输入文本',
      title: null,
      content: null,
      summary: null,
      createdAt: new Date('2026-04-19T00:00:00.000Z'),
      updatedAt: new Date('2026-04-19T00:00:00.000Z'),
    })

    expect(result.title).toBe('原始输入文本')
    expect(result.content).toBe('原始输入文本')
    expect(result.excerpt).toBe('原始输入文本')
  })

  it('does not let summary override the primary note excerpt anymore', () => {
    const result = toNoteListItem({
      id: 'note_3',
      originalText: '原始输入文本',
      title: null,
      content: '真正展示的正文',
      summary: '旧摘要副本',
      createdAt: new Date('2026-04-19T00:00:00.000Z'),
      updatedAt: new Date('2026-04-19T00:00:00.000Z'),
    })

    expect(result.excerpt).toBe('真正展示的正文')
  })
})
