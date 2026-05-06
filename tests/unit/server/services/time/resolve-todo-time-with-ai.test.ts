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

  it('resolves locally parseable time text without calling the model', async () => {
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
      dueAt: '2026-04-30T12:00:00.000Z',
      resolutionKind: 'clear',
    })
    expect(mocks.generateText).not.toHaveBeenCalled()
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
      ['晚点'],
      ['有空的时候'],
    ])('clears AI-produced dueAt for vague phrase: %s', async (timeText) => {
      mocks.generateText.mockResolvedValueOnce({
        output: {
          timeText,
          dueAt: '2026-05-01T00:00:00.000Z',
          resolutionKind: 'clear',
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

  it('returns vague resolution for broad time phrases', async () => {
    mocks.generateText.mockResolvedValueOnce({
      output: {
        timeText: '下周',
        dueAt: null,
        resolutionKind: 'vague',
      },
    })

    await expect(resolveTodoTimeWithAi({
      title: '整理报价',
      slots: { timeText: '下周' },
      referenceTime: '2026-05-06T08:00:00.000Z',
    })).resolves.toEqual({
      timeText: '下周',
      dueAt: null,
      resolutionKind: 'vague',
    })
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
