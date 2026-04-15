import { describe, it, expect } from 'vitest'
import {
  detectExplicitSummaryIntent,
  resolveExplicitSummaryTarget,
} from '@/server/services/assets/assets.summary-intent.pure'

describe('assets.summary-intent', () => {
  it('detects supported explicit summary intents', () => {
    expect(detectExplicitSummaryIntent('复盘一下未完成待办')).toEqual({
      summaryTarget: 'unfinished_todos',
    })
    expect(detectExplicitSummaryIntent('总结最近笔记')).toEqual({
      summaryTarget: 'recent_notes',
    })
    expect(detectExplicitSummaryIntent('总结最近收藏的链接')).toEqual({
      summaryTarget: 'recent_bookmarks',
    })
  })

  it('does not detect ambiguous summary requests', () => {
    expect(detectExplicitSummaryIntent('总结一下 AI')).toBe(null)
    expect(detectExplicitSummaryIntent('总结一下')).toBe(null)
    expect(detectExplicitSummaryIntent('帮我总结这个链接 https://example.com/a')).toBe(null)
    expect(detectExplicitSummaryIntent('最近 AI 有什么')).toBe(null)
    expect(detectExplicitSummaryIntent('总结已完成待办')).toBe(null)
    expect(detectExplicitSummaryIntent('总结所有待办')).toBe(null)
    expect(detectExplicitSummaryIntent('总结最近待办')).toBe(null)
  })

  it('does not trust a model summary target without explicit user phrasing', () => {
    expect(resolveExplicitSummaryTarget('总结最近笔记')).toBe('recent_notes')
    expect(resolveExplicitSummaryTarget('总结一下 AI')).toBe(null)
    expect(resolveExplicitSummaryTarget('总结已完成待办')).toBe(null)
  })
})
