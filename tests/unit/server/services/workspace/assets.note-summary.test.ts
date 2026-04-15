import { describe, it, expect } from 'vitest'
import { buildNoteSummaryPromptInput } from '@/server/services/workspace/notes.summary.service'

describe('assets.note-summary', () => {
  it('buildNoteSummaryPromptInput keeps bounded note records', () => {
    const input = buildNoteSummaryPromptInput([
      {
        id: 'note-1',
        originalText: '关于定价的想法：先验证单人用户愿不愿意每天记录。',
        title: '关于定价的想法：先验证单人用户愿不愿意每天记录。',
        excerpt: '关于定价的想法：先验证单人用户愿不愿意每天记录。',
        type: 'note',
        url: null,
        timeText: null,
        dueAt: null,
        completed: false,
        createdAt: new Date('2026-04-13T02:00:00.000Z'),
      },
    ])

    expect(input.length).toBe(1)
    expect(Object.keys(input[0]).sort()).toEqual([
      'createdAt',
      'id',
      'text',
    ])
    expect(input[0].text).toBe('关于定价的想法：先验证单人用户愿不愿意每天记录。')
  })
})