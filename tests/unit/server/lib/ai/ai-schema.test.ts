import { describe, expect, it } from 'vitest'

import { parsedCommandSchema } from '@/server/lib/ai/ai-schema'

function buildBaseCommand() {
  return {
    confidence: 0.9,
    originalText: '保存这个链接 https://example.com',
    rawInput: '保存这个链接 https://example.com',
  }
}

describe('parsedCommandSchema', () => {
  it('accepts a valid create_link command', () => {
    const result = parsedCommandSchema.safeParse({
      ...buildBaseCommand(),
      intent: 'create',
      operation: 'create_link',
      assetType: 'link',
      todo: null,
      note: null,
      bookmark: {
        url: 'https://example.com',
        title: null,
        note: null,
        summary: null,
      },
      search: null,
      summary: null,
    })

    expect(result.success).toBe(true)
  })

  it('rejects mismatched intent and operation pairs', () => {
    const result = parsedCommandSchema.safeParse({
      ...buildBaseCommand(),
      intent: 'search',
      operation: 'create_link',
      assetType: 'link',
      todo: null,
      note: null,
      bookmark: {
        url: 'https://example.com',
        title: null,
        note: null,
        summary: null,
      },
      search: null,
      summary: null,
    })

    expect(result.success).toBe(false)
  })

  it('rejects commands with non-active payloads populated', () => {
    const result = parsedCommandSchema.safeParse({
      ...buildBaseCommand(),
      intent: 'create',
      operation: 'create_todo',
      assetType: 'todo',
      todo: {
        title: '整理发布清单',
        content: null,
        timeText: null,
        dueAtIso: null,
      },
      note: {
        title: '不应该出现',
        content: null,
        summary: null,
      },
      bookmark: null,
      search: null,
      summary: null,
    })

    expect(result.success).toBe(false)
  })

  it('rejects search_assets without search payload', () => {
    const result = parsedCommandSchema.safeParse({
      confidence: 0.8,
      originalText: '帮我找上周收藏的文章',
      intent: 'search',
      operation: 'search_assets',
      assetType: null,
      todo: null,
      note: null,
      bookmark: null,
      search: null,
      summary: null,
    })

    expect(result.success).toBe(false)
  })

  it('rejects summarize_workspace without summary payload', () => {
    const result = parsedCommandSchema.safeParse({
      confidence: 0.8,
      originalText: '总结一下最近收藏',
      intent: 'summarize',
      operation: 'summarize_workspace',
      assetType: null,
      todo: null,
      note: null,
      bookmark: null,
      search: null,
      summary: null,
    })

    expect(result.success).toBe(false)
  })

  it('rejects assetType that does not match operation payload', () => {
    const result = parsedCommandSchema.safeParse({
      ...buildBaseCommand(),
      intent: 'create',
      operation: 'create_note',
      assetType: 'todo',
      todo: null,
      note: {
        title: '首页文案方向',
        content: null,
        summary: null,
      },
      bookmark: null,
      search: null,
      summary: null,
    })

    expect(result.success).toBe(false)
  })
})
