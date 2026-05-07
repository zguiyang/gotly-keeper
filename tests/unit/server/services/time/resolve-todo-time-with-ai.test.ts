import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { resolveTodoTimeWithAi as ResolveTodoTimeWithAi } from '@/server/services/time/resolve-todo-time-with-ai'

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
  getAiProvider: vi.fn(),
  buildWorkspaceSystemPrompt: vi.fn(),
  renderPrompt: vi.fn(),
}))

vi.mock('ai', () => ({
  generateText: mocks.generateText,
  Output: {
    object: ({ schema }: { schema: unknown }) => ({ schema }),
  },
  stepCountIs: (count: number) => count,
  tool: (definition: unknown) => definition,
}))

vi.mock('@/server/lib/ai/ai-provider', () => ({
  getAiProvider: mocks.getAiProvider,
}))

vi.mock('@/server/lib/ai/ai.prompts', () => ({
  buildWorkspaceSystemPrompt: mocks.buildWorkspaceSystemPrompt,
}))

vi.mock('@/server/lib/prompt-template', () => ({
  renderPrompt: mocks.renderPrompt,
}))

describe('resolve-todo-time-with-ai', () => {
  let resolveTodoTimeWithAi: typeof ResolveTodoTimeWithAi

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.generateText.mockReset()
    mocks.getAiProvider.mockReset()
    mocks.buildWorkspaceSystemPrompt.mockReset()
    mocks.renderPrompt.mockReset()
    mocks.getAiProvider.mockReturnValue({ provider: 'mock-model' })
    mocks.buildWorkspaceSystemPrompt.mockResolvedValue('system prompt')
    mocks.renderPrompt.mockResolvedValue('user prompt')
  })

  beforeEach(async () => {
    ;({ resolveTodoTimeWithAi } = await import('@/server/services/time/resolve-todo-time-with-ai'))
  })

  it('returns the structured dueAt produced by the model flow', async () => {
    mocks.generateText.mockResolvedValueOnce({
      output: {
        timeText: '明天上午',
        dueAt: '2026-05-01T01:00:00.000Z',
        resolutionKind: 'clear',
      },
    })

    await expect(
      resolveTodoTimeWithAi({
        title: '开会',
        fallbackTimeHint: '明天上午',
        referenceTime: '2026-04-30T02:10:00.000Z',
      })
    ).resolves.toEqual({
      timeText: '明天上午',
      dueAt: '2026-05-01T01:00:00.000Z',
      resolutionKind: 'clear',
    })
  })

  it('accepts the prompt-produced default for 今晚 as 21:00', async () => {
    mocks.generateText.mockResolvedValueOnce({
      output: {
        timeText: '今晚',
        dueAt: '2026-04-30T13:00:00.000Z',
        resolutionKind: 'clear',
      },
    })

    await expect(
      resolveTodoTimeWithAi({
        title: '处理邮件',
        slots: {
          dueTime: '今晚',
        },
        referenceTime: '2026-04-30T02:10:00.000Z',
      })
    ).resolves.toEqual({
      timeText: '今晚',
      dueAt: '2026-04-30T13:00:00.000Z',
      resolutionKind: 'clear',
    })
    expect(mocks.generateText).toHaveBeenCalledOnce()
  })

  it('returns unresolved without calling the model when no time information exists', async () => {
    const result = await resolveTodoTimeWithAi({
      title: '整理报价',
      slots: {},
      referenceTime: '2026-04-30T02:10:00.000Z',
    })

    expect(result).toEqual({
      timeText: null,
      dueAt: null,
      resolutionKind: 'unresolved',
    })
    expect(mocks.generateText).not.toHaveBeenCalled()
  })

  describe('exact time phrases', () => {
    it.each([
      ['后天下午三点'],
      ['周五上午十点'],
      ['五分钟后'],
    ])('returns dueAt for exact time phrase: %s', async (timeText) => {
      mocks.generateText.mockResolvedValueOnce({
        output: {
          timeText,
          dueAt: null,
          resolutionKind: 'unresolved',
        },
      })

      const result = await resolveTodoTimeWithAi({
        title: '测试任务',
        slots: { timeText },
        referenceTime: '2026-04-30T02:10:00.000Z',
      })

      expect(result.timeText).toBe(timeText)
      expect(result.dueAt).not.toBeNull()
      expect(result.dueAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })
  })

  describe('vague time phrases', () => {
    it.each([
      ['尽快'],
      ['有空的时候'],
    ])('preserves prompt-produced vague result for phrase: %s', async (timeText) => {
      mocks.generateText.mockResolvedValueOnce({
        output: {
          timeText,
          dueAt: null,
          resolutionKind: 'vague',
        },
      })

      const result = await resolveTodoTimeWithAi({
        title: '测试任务',
        slots: { timeText },
        referenceTime: '2026-04-30T02:10:00.000Z',
      })

      expect(result.timeText).toBe(timeText)
      expect(result.dueAt).toBeNull()
    })
  })

  it('accepts the prompt-produced default for 晚点 as 30 minutes later', async () => {
    mocks.generateText.mockResolvedValueOnce({
      output: {
        timeText: '晚点',
        dueAt: '2026-05-06T14:40:00.000Z',
        resolutionKind: 'clear',
      },
    })

    await expect(resolveTodoTimeWithAi({
      title: '晚点回消息',
      slots: { timeText: '晚点' },
      referenceTime: '2026-05-06T14:10:00.000Z',
    })).resolves.toEqual({
      timeText: '晚点',
      dueAt: '2026-05-06T14:40:00.000Z',
      resolutionKind: 'clear',
    })
    expect(mocks.generateText).toHaveBeenCalledOnce()
  })

  it('accepts the prompt-produced default for 明天 as 09:00', async () => {
    mocks.generateText.mockResolvedValueOnce({
      output: {
        timeText: '明天',
        dueAt: '2026-05-07T01:00:00.000Z',
        resolutionKind: 'clear',
      },
    })

    await expect(resolveTodoTimeWithAi({
      title: '明天处理合同',
      slots: { timeText: '明天' },
      referenceTime: '2026-05-06T08:10:00.000Z',
    })).resolves.toEqual({
      timeText: '明天',
      dueAt: '2026-05-07T01:00:00.000Z',
      resolutionKind: 'clear',
    })
    expect(mocks.generateText).toHaveBeenCalledOnce()
  })

  it('accepts the prompt-produced default for 下周 as next monday 09:00', async () => {
    mocks.generateText.mockResolvedValueOnce({
      output: {
        timeText: '下周',
        dueAt: '2026-05-11T01:00:00.000Z',
        resolutionKind: 'clear',
      },
    })

    await expect(resolveTodoTimeWithAi({
      title: '下周整理报价',
      slots: { timeText: '下周' },
      referenceTime: '2026-05-06T08:10:00.000Z',
    })).resolves.toEqual({
      timeText: '下周',
      dueAt: '2026-05-11T01:00:00.000Z',
      resolutionKind: 'clear',
    })
    expect(mocks.generateText).toHaveBeenCalledOnce()
  })

  it('keeps no due date for recent phrases outside the default rule set', async () => {
    mocks.generateText.mockResolvedValueOnce({
      output: {
        timeText: '这周末',
        dueAt: null,
        resolutionKind: 'no_due_date',
      },
    })

    await expect(resolveTodoTimeWithAi({
      title: '这周末整理资料',
      slots: { timeText: '这周末' },
      referenceTime: '2026-05-06T08:10:00.000Z',
    })).resolves.toEqual({
      timeText: '这周末',
      dueAt: null,
      resolutionKind: 'no_due_date',
    })
    expect(mocks.generateText).toHaveBeenCalledOnce()
  })

  it('clears AI-produced dueAt for unsupported holiday phrases', async () => {
    mocks.generateText.mockResolvedValueOnce({
      output: {
        timeText: '国庆放假后',
        dueAt: '2026-10-08T10:00:00.000Z',
        resolutionKind: 'clear',
      },
    })

    const result = await resolveTodoTimeWithAi({
      title: '测试任务',
      slots: { timeText: '国庆放假后' },
      referenceTime: '2026-04-30T02:10:00.000Z',
    })

    expect(result.timeText).toBe('国庆放假后')
    expect(result.dueAt).toBeNull()
  })

  it('returns clear resolution for exact time phrases', async () => {
    await expect(resolveTodoTimeWithAi({
      title: '给客户发报价',
      slots: { timeText: '5月7日下午3点' },
      referenceTime: '2026-05-06T08:00:00.000Z',
    })).resolves.toEqual({
      timeText: '5月7日下午3点',
      dueAt: '2026-05-07T07:00:00.000Z',
      resolutionKind: 'clear',
    })
    expect(mocks.generateText).not.toHaveBeenCalled()
  })

  it('returns clear resolution for broad time phrases covered by todo defaults', async () => {
    mocks.generateText.mockResolvedValueOnce({
      output: {
        timeText: '下周',
        dueAt: '2026-05-11T01:00:00.000Z',
        resolutionKind: 'clear',
      },
    })

    await expect(resolveTodoTimeWithAi({
      title: '整理报价',
      slots: { timeText: '下周' },
      referenceTime: '2026-05-06T08:00:00.000Z',
    })).resolves.toEqual({
      timeText: '下周',
      dueAt: '2026-05-11T01:00:00.000Z',
      resolutionKind: 'clear',
    })
    expect(mocks.generateText).toHaveBeenCalledOnce()
  })

  it('preserves AI-produced dueAt when local parser cannot parse the phrase', async () => {
    mocks.generateText.mockResolvedValueOnce({
      output: {
        timeText: 'tomorrow at 3pm',
        dueAt: '2026-05-07T07:00:00.000Z',
        resolutionKind: 'clear',
      },
    })

    const result = await resolveTodoTimeWithAi({
      title: '测试任务',
      slots: { timeText: 'tomorrow at 3pm' },
      referenceTime: '2026-04-30T02:10:00.000Z',
    })

    expect(result.timeText).toBe('tomorrow at 3pm')
    expect(result.dueAt).toBe('2026-05-07T07:00:00.000Z')
  })
})
