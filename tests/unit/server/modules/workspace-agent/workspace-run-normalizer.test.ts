import { describe, expect, it } from 'vitest'

import {
  normalizeWorkspaceRunInput,
  normalizeWorkspaceRunInputWithModel,
  workspaceRunNormalizationModelResultSchema,
} from '@/server/modules/workspace-agent/workspace-run-normalizer'

describe('workspace-run-normalizer', () => {
  it('preserves raw text and extracts urls and separators', () => {
    const input =
      '  帮我记个待办，顺便看看这个网止 https://example.com/a ；提行我明天下午三点看 prcing。  '

    expect(normalizeWorkspaceRunInput(input)).toEqual({
      rawText: input,
      normalizedText: input.trim(),
      urls: ['https://example.com/a'],
      separators: ['，', '；', '。'],
      typoCandidates: [],
      timeHints: [],
    })
  })

  it('records ascii separators in appearance order', () => {
    const input = '记一下, 明天整理 pricing; 然后发给我。'

    expect(normalizeWorkspaceRunInput(input).separators).toEqual([',', ';', '。'])
  })

  it('extracts urls without swallowing trailing punctuation', () => {
    const input = '保存这个链接 https://example.com/pricing。'

    expect(normalizeWorkspaceRunInput(input).urls).toEqual([
      'https://example.com/pricing',
    ])
  })

  it('preserves user wording for semantic stages to interpret later', () => {
    const input = '记个待半：5月10日早上买燕麦奶'

    expect(normalizeWorkspaceRunInput(input)).toEqual({
      rawText: input,
      normalizedText: '记个待半：5月10日早上买燕麦奶',
      urls: [],
      separators: [],
      typoCandidates: [],
      timeHints: [],
    })
  })

  it('keeps deterministic url and separator extraction while using the model for semantic cleanup', async () => {
    const runModel = async () => ({
      rawText: '  你好，记个待半：明天下午三点看 prcing https://example.com/a；谢谢  ',
      normalizedText: '记个待半：明天下午三点看 prcing https://example.com/a',
      urls: [],
      separators: [],
      typoCandidates: [
        { text: '待半', suggestion: '待办' },
        { text: 'prcing', suggestion: 'pricing' },
      ],
      timeHints: ['明天下午三点'],
    })

    const result = await normalizeWorkspaceRunInputWithModel({
      rawText: '  你好，记个待半：明天下午三点看 prcing https://example.com/a；谢谢  ',
      runModel,
    })

    expect(result).toEqual(
      workspaceRunNormalizationModelResultSchema.parse({
        rawText: '  你好，记个待半：明天下午三点看 prcing https://example.com/a；谢谢  ',
        normalizedText: '记个待半：明天下午三点看 prcing https://example.com/a',
        urls: ['https://example.com/a'],
        separators: ['，', '；'],
        typoCandidates: [
          { text: '待半', suggestion: '待办' },
          { text: 'prcing', suggestion: 'pricing' },
        ],
        timeHints: ['明天下午三点'],
      })
    )
  })
})
