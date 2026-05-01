import { describe, expect, it } from 'vitest'

import { normalizeWorkspaceRunInput } from '@/server/modules/workspace-agent/workspace-run-normalizer'

describe('workspace-run-normalizer', () => {
  it('preserves raw text and extracts urls and separators', () => {
    const input =
      '  帮我记个待办，顺便看看这个网止 https://example.com/a ；提行我明天下午三点看 prcing。  '

    expect(normalizeWorkspaceRunInput(input)).toEqual({
      rawText: input,
      normalizedText: input.trim(),
      urls: ['https://example.com/a'],
      separators: ['，', '；', '。'],
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
})
