import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AiProviderError, AiSchemaError, AiTimeoutError } from '@/server/lib/ai/ai.types'
import { WORKSPACE_TASK_PARSE_TIMEOUT_MS } from '@/server/lib/config/constants'
import { createWorkspaceRunRuntime } from '@/server/modules/workspace-agent/workspace-run-runtime'

const mocks = vi.hoisted(() => ({
  runAiGeneration: vi.fn(),
}))

vi.mock('@/server/lib/ai/ai-runner', () => ({
  runAiGeneration: mocks.runAiGeneration,
}))

describe('workspace-run-runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('preserves provider failure details from AI generation', async () => {
    mocks.runAiGeneration.mockResolvedValueOnce({
      success: false,
      error: new AiProviderError('AI provider not configured', null),
    })

    const { runModel } = createWorkspaceRunRuntime()

    await expect(
      runModel({
        systemPrompt: 'system prompt',
        userPrompt: 'user prompt',
      })
    ).rejects.toMatchObject({
      message: 'AI provider not configured',
      retryable: true,
      code: 'AI_PROVIDER_ERROR',
    })
  })

  it('marks schema failures as non-retryable', async () => {
    mocks.runAiGeneration.mockResolvedValueOnce({
      success: false,
      error: new AiSchemaError('Schema mismatch', null),
    })

    const { runModel } = createWorkspaceRunRuntime()

    await expect(
      runModel({
        systemPrompt: 'system prompt',
        userPrompt: 'user prompt',
      })
    ).rejects.toMatchObject({
      message: 'Schema mismatch',
      retryable: false,
      code: 'AI_SCHEMA_ERROR',
    })
  })

  it('marks timeout failures as retryable', async () => {
    mocks.runAiGeneration.mockResolvedValueOnce({
      success: false,
      error: new AiTimeoutError('The operation was aborted due to timeout'),
    })

    const { runModel } = createWorkspaceRunRuntime()

    await expect(
      runModel({
        systemPrompt: 'system prompt',
        userPrompt: 'user prompt',
      })
    ).rejects.toMatchObject({
      message: '理解这次输入超时了，请稍后重试；如果内容较多，可以分两次发送。',
      retryable: true,
      code: 'AI_TIMEOUT',
    })
  })

  it('uses the workspace understanding timeout for run model calls', async () => {
    const controller = new AbortController()

    mocks.runAiGeneration.mockResolvedValueOnce({
      success: true,
      data: {
        draftTasks: [
          {
            id: 'draft_1',
            intent: 'create',
            target: 'todos',
            title: '给客户发报价',
            confidence: 0.92,
            ambiguities: [],
            corrections: [],
            slotEntries: [],
          },
        ],
      },
    })

    const { runModel } = createWorkspaceRunRuntime()

    await runModel({
      systemPrompt: 'system prompt',
      userPrompt: 'user prompt',
      signal: controller.signal,
    })

    expect(mocks.runAiGeneration).toHaveBeenCalledWith(
      expect.objectContaining({
        timeoutMs: WORKSPACE_TASK_PARSE_TIMEOUT_MS,
        abortSignal: controller.signal,
      })
    )
  })
})
