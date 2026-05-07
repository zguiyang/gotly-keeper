import { describe, expect, it, vi } from 'vitest'

import {
  semanticSplitResultSchema,
  splitWorkspaceRunInputSemantically,
} from '@/server/modules/workspace-agent/workspace-run-semantic-split'

describe('workspace-run-semantic-split', () => {
  it('returns validated split output and preserves corrections', async () => {
    const runModel = vi.fn().mockResolvedValue({
      isMultiTask: true,
      corrections: [
        {
          from: '待半',
          to: '待办',
          reason: 'typo',
        },
      ],
      segments: [
        {
          id: 'segment_1',
          text: '记个待办：明天给客户发报价',
          relation: 'independent',
          confidence: 0.95,
        },
        {
          id: 'segment_2',
          text: '再记一下：首页 slogan 想走轻管家感',
          relation: 'independent',
          confidence: 0.93,
        },
      ],
    })

    const result = await splitWorkspaceRunInputSemantically({
      normalized: {
        rawText: '记个待半：明天给客户发报价；再记一下：首页 slogan 想走轻管家感',
        normalizedText: '记个待办：明天给客户发报价；再记一下：首页 slogan 想走轻管家感',
        urls: [],
        separators: ['；'],
      },
      runModel,
    })

    expect(result).toEqual(
      semanticSplitResultSchema.parse({
        isMultiTask: true,
        corrections: [
          {
            from: '待半',
            to: '待办',
            reason: 'typo',
          },
        ],
        segments: [
          {
            id: 'segment_1',
            text: '记个待办：明天给客户发报价',
            relation: 'independent',
            confidence: 0.95,
          },
          {
            id: 'segment_2',
            text: '再记一下：首页 slogan 想走轻管家感',
            relation: 'independent',
            confidence: 0.93,
          },
        ],
      })
    )
  })

  it('passes the abort signal through to the model', async () => {
    const controller = new AbortController()
    const runModel = vi.fn().mockResolvedValue({
      isMultiTask: false,
      corrections: [],
      segments: [
        {
          id: 'segment_1',
          text: '记个待办：明天给客户发报价',
          relation: 'independent',
          confidence: 0.95,
        },
      ],
    })

    await splitWorkspaceRunInputSemantically({
      normalized: {
        rawText: '记个待办：明天给客户发报价',
        normalizedText: '记个待办：明天给客户发报价',
        urls: [],
        separators: [],
      },
      runModel,
      signal: controller.signal,
    })

    expect(runModel).toHaveBeenCalledWith(
      expect.objectContaining({
        signal: controller.signal,
      })
    )
  })
})
