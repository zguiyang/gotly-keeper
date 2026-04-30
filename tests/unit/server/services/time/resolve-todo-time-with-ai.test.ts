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
    })
  })

  it('returns no due date and preserves extracted time text when the ai call fails', async () => {
    mocks.generateText.mockRejectedValueOnce(new Error('provider timeout'))

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
      dueAt: null,
    })
  })
})
