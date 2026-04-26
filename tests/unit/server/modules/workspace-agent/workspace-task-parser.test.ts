import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AiTimeoutError } from '@/server/lib/ai/ai.types'
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

    expect(mocks.runAiGeneration).toHaveBeenCalledWith(
      expect.objectContaining({
        timeoutMs: 60_000,
      })
    )

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

  it('surfaces a friendly retry message when AI parsing times out', async () => {
    mocks.runAiGeneration.mockResolvedValueOnce({
      success: false,
      error: new AiTimeoutError('The operation was aborted due to timeout'),
    })

    await expect(
      parseWorkspaceTask({
        userId: 'user_1',
        message:
          '记个待办：明天下午 3 点前给木曜日咖啡发上新营销报价，备注：报价拆成拍摄 6800、文案 2400、达人沟通 5000 三项，并附两档可选方案。',
      })
    ).rejects.toThrow('处理超时了，请稍后重试。')
  })

  it('keeps non-timeout AI parsing errors unchanged', async () => {
    mocks.runAiGeneration.mockResolvedValueOnce({
      success: false,
      error: new Error('schema mismatch'),
    })

    await expect(
      parseWorkspaceTask({
        userId: 'user_1',
        message: '记个待办：明天下午 3 点前给木曜日咖啡发上新营销报价',
      })
    ).rejects.toThrow('schema mismatch')
  })
})
