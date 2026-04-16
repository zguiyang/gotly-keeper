import { describe, it, expect } from 'vitest'

import { buildNoteSummaryPromptInput } from '@/server/modules/workspace/notes.summary'

import type { AssetListItem } from '@/shared/assets/assets.types'


describe('notes.summary.service', () => {
  describe('buildNoteSummaryPromptInput', () => {
    it('transforms notes correctly', () => {
      const notes: AssetListItem[] = [
        {
          id: 'note-1',
          originalText: '测试笔记内容',
          title: '测试笔记',
          excerpt: '测试笔记内容',
          type: 'note',
          url: null,
          timeText: null,
          dueAt: null,
          completed: false,
          createdAt: new Date('2026-04-13T02:00:00.000Z'),
        },
      ]

      const result = buildNoteSummaryPromptInput(notes)

      expect(result.length).toBe(1)
      expect(result[0].id).toBe('note-1')
      expect(result[0].text).toBe('测试笔记内容')
      expect(result[0].createdAt).toBe('2026-04-13T02:00:00.000Z')
    })

    it('respects NOTE_SUMMARY_LIMIT', () => {
      const notes: AssetListItem[] = Array.from({ length: 15 }, (_, i) => ({
        id: `note-${i}`,
        originalText: `笔记内容 ${i}`,
        title: `笔记 ${i}`,
        excerpt: `摘要 ${i}`,
        type: 'note' as const,
        url: null,
        timeText: null,
        dueAt: null,
        completed: false,
        createdAt: new Date(),
      }))

      const result = buildNoteSummaryPromptInput(notes)

      expect(result.length).toBeLessThanOrEqual(10)
    })
  })
})
