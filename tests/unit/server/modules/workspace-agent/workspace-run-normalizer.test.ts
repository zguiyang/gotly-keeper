import { describe, expect, it } from 'vitest'

import { normalizeWorkspaceRunInput } from '@/server/modules/workspace-agent/workspace-run-normalizer'

describe('workspace-run-normalizer', () => {
  it('preserves raw text and extracts trimmed text urls separators typo candidates and time hints', () => {
    const input =
      '  帮我记个待办，顺便看看这个网止 https://example.com/a ；提行我明天下午三点看 prcing。  '

    expect(normalizeWorkspaceRunInput(input)).toEqual({
      rawText: input,
      normalizedText:
        '帮我记个待办，顺便看看这个网址 https://example.com/a ；提醒我明天下午三点看 pricing。',
      urls: ['https://example.com/a'],
      separators: ['，', '；', '。'],
      typoCandidates: [
        {
          text: '网止',
          suggestion: '网址',
        },
        {
          text: '提行',
          suggestion: '提醒',
        },
        {
          text: 'prcing',
          suggestion: 'pricing',
        },
      ],
      timeHints: ['明天下午三点'],
    })
  })

  it('records ascii separators in appearance order', () => {
    const input = '记一下, 明天整理 pricing; 然后发给我。'

    expect(normalizeWorkspaceRunInput(input).separators).toEqual([',', ';', '。'])
  })

  it('extracts relative chinese time phrases into timeHints', () => {
    const input = '五分钟后提醒我发周报'

    expect(normalizeWorkspaceRunInput(input).timeHints).toEqual(['五分钟后'])
  })

  it('extracts weekend next-month and cutoff time phrases into timeHints', () => {
    expect(normalizeWorkspaceRunInput('这周末买菜').timeHints).toEqual(['这周末'])
    expect(normalizeWorkspaceRunInput('下周末整理房间').timeHints).toEqual(['下周末'])
    expect(normalizeWorkspaceRunInput('下个月1号提交发票').timeHints).toEqual(['下个月1号'])
    expect(normalizeWorkspaceRunInput('本周五下班前发合同').timeHints).toEqual(['本周五下班前'])
  })

  it('extracts urls without swallowing trailing punctuation', () => {
    const input = '保存这个链接 https://example.com/pricing。'

    expect(normalizeWorkspaceRunInput(input).urls).toEqual([
      'https://example.com/pricing',
    ])
  })

  it('does not rewrite typo text inside urls', () => {
    const input = '保存这个链接 https://example.com/prcing 然后提醒我看 prcing'

    expect(normalizeWorkspaceRunInput(input)).toEqual({
      rawText: input,
      normalizedText: '保存这个链接 https://example.com/prcing 然后提醒我看 pricing',
      urls: ['https://example.com/prcing'],
      separators: [],
      typoCandidates: [
        {
          text: 'prcing',
          suggestion: 'pricing',
        },
      ],
      timeHints: [],
    })
  })
})
