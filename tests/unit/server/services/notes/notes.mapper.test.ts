import { describe, expect, it } from 'vitest'

import { toNoteListItem } from '@/server/services/notes/notes.mapper'

describe('notes.mapper', () => {
  it('prefers structured title and summary when available', () => {
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
    expect(result.excerpt).toBe('结构化摘要')
  })

  it('falls back to content then originalText for excerpt', () => {
    const result = toNoteListItem({
      id: 'note_2',
      originalText: '原始输入文本',
      title: null,
      content: '结构化正文',
      summary: null,
      createdAt: new Date('2026-04-19T00:00:00.000Z'),
      updatedAt: new Date('2026-04-19T00:00:00.000Z'),
    })

    expect(result.title).toBe('原始输入文本')
    expect(result.excerpt).toBe('结构化正文')
  })
})
