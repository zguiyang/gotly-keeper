import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { parseWorkspaceTask } from '@/server/modules/workspace-agent/workspace-task-parser'

const mocks = vi.hoisted(() => ({
  buildWorkspaceSystemPrompt: vi.fn(),
  renderPrompt: vi.fn(),
  runAiGeneration: vi.fn(),
}))

vi.mock('@/server/lib/ai/ai.prompts', () => ({
  buildWorkspaceSystemPrompt: mocks.buildWorkspaceSystemPrompt,
}))

vi.mock('@/server/lib/ai/ai-runner', () => ({
  runAiGeneration: mocks.runAiGeneration,
}))

vi.mock('@/server/lib/prompt-template', () => ({
  renderPrompt: mocks.renderPrompt,
}))

describe('workspace-task-parser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-24T08:32:10.123Z'))
    mocks.buildWorkspaceSystemPrompt.mockResolvedValue('system prompt')
    mocks.renderPrompt.mockResolvedValue('user prompt')
    mocks.runAiGeneration.mockResolvedValue({
      success: true,
      data: {
        intent: 'create',
        target: 'todos',
        payload: {
          title: '交周报',
          timeText: '下周三下午',
          dueAt: '2026-04-29T07:00:00.000Z',
        },
      },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('injects Shanghai time context into the task parse prompt', async () => {
    await parseWorkspaceTask({
      userId: 'user_1',
      message: '下周三下午交周报',
    })

    expect(mocks.renderPrompt).toHaveBeenCalledWith(
      'workspace-agent/task-parse.user',
      expect.objectContaining({
        payloadJson: expect.stringContaining('"message":"下周三下午交周报"'),
        timeContextJson: expect.stringContaining('"timezone":"Asia/Shanghai"'),
      })
    )
    expect(mocks.renderPrompt.mock.calls[0][1].timeContextJson).toContain(
      '"currentDateTime":"2026-04-24 16:32:10"'
    )
    expect(mocks.renderPrompt.mock.calls[0][1].timeContextJson).toContain('"utcOffset":"+08:00"')
    expect(mocks.renderPrompt.mock.calls[0][1].timeContextJson).toContain('"weekday":"Friday"')
  })
})
