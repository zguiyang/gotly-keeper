import { describe, expect, it } from 'vitest'

import {
  deriveBookmarkStructuredBackfill,
  deriveNoteStructuredBackfill,
  deriveTodoStructuredBackfill,
} from '@/server/services/assets/asset-structured-backfill'

describe('asset structured backfill', () => {
  it('strips obvious command prefixes from note titles conservatively', () => {
    expect(
      deriveNoteStructuredBackfill({
        originalText: '记一下 需求评审\n\n补充边界条件',
      })
    ).toEqual({
      title: '需求评审',
      content: '补充边界条件',
      summary: '补充边界条件',
    })
  })

  it('uses remaining content as todo body without固化命令词', () => {
    expect(
      deriveTodoStructuredBackfill({
        originalText: '提醒我 提交周报\n补充项目风险',
      })
    ).toEqual({
      title: '提交周报',
      content: '补充项目风险',
    })
  })

  it('prefers bookmark meta title and keeps note/summary conservative', () => {
    expect(
      deriveBookmarkStructuredBackfill({
        originalText: '存一下这个链接\n流式输出示例\nhttps://example.com',
        url: 'https://example.com',
        bookmarkMeta: {
          status: 'success',
          title: 'AI SDK Docs',
          icon: null,
          bookmarkType: null,
          description: 'SDK docs',
          contentSummary: 'Streaming guide',
          errorCode: null,
          errorMessage: null,
          updatedAt: '2026-04-19T00:00:00.000Z',
        },
      })
    ).toEqual({
      title: 'AI SDK Docs',
      note: '流式输出示例',
      summary: 'Streaming guide',
    })
  })

  it('drops known inline bookmark url from single-line titles', () => {
    expect(
      deriveBookmarkStructuredBackfill({
        originalText: '存一下 https://example.com',
        url: 'https://example.com',
      })
    ).toEqual({
      title: null,
      note: null,
      summary: null,
    })
  })
})
