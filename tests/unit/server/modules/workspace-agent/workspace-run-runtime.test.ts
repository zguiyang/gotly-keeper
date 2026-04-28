import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AiProviderError, AiSchemaError, AiTimeoutError } from '@/server/lib/ai/ai.types'
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
      message: 'The operation was aborted due to timeout',
      retryable: true,
      code: 'AI_TIMEOUT',
    })
  })
})
