import { describe, expect, it } from 'vitest'

import { buildAssetInterpreterPrompt } from '@/server/lib/ai/ai.prompts'
import { parsedCommandSchema } from '@/server/lib/ai/ai-schema'
import { renderPrompt } from '@/server/lib/prompt-template'

describe('asset-interpreter contract', () => {
  it('system template uses current ParsedCommand contract names', async () => {
    const systemPrompt = await renderPrompt('ai/asset-interpreter.system', {})

    expect(systemPrompt).toContain('ParsedCommand')
    expect(systemPrompt).toContain('operation')
    expect(systemPrompt).toContain('summarize_workspace')
    expect(systemPrompt).toContain('summary.target')
    expect(systemPrompt).not.toContain('summarize_assets')
    expect(systemPrompt).not.toContain('summaryTarget')
    expect(systemPrompt).not.toContain('create_bookmark')
  })

  it('prompt builder does not rely on runtime override appendix', async () => {
    const prompt = await buildAssetInterpreterPrompt('总结一下最近收藏')

    expect(prompt).not.toContain('以下字段契约覆盖旧版本同名说明')
    expect(prompt).not.toContain('旧字段/旧值')
    expect(prompt).toContain('请直接返回符合 ParsedCommand 的 JSON 对象')
  })

  it('schema module no longer exports misleading legacy aliases', async () => {
    const schemaModule = await import('@/server/lib/ai/ai-schema')

    expect(schemaModule).not.toHaveProperty('assetInputIntentSchema')
    expect(schemaModule).not.toHaveProperty('aiAssetInputSchema')
    expect(schemaModule).not.toHaveProperty('AiAssetInput')
    expect(schemaModule).toHaveProperty('parsedCommandSchema')
  })

  it('keeps rawInput and originalText transition contract', () => {
    const result = parsedCommandSchema.safeParse({
      intent: 'create',
      operation: 'create_link',
      confidence: 0.9,
      originalText: '保存这个链接 https://example.com',
      rawInput: '保存这个链接 https://example.com',
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
})
