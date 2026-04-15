import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'

import { serverEnv } from '@/server/env'
import {
  interpretAssetInputWithAi,
  runAiGeneration,
  summarizeWithAi,
} from '../../../server/ai/ai-runner'

function withAiProviderDisabled<T>(run: () => Promise<T>): Promise<T> {
  const original = { ...serverEnv.aiGateway }
  ;(serverEnv.aiGateway as { apiKey?: string; url?: string; modelName?: string }).apiKey = undefined
  ;(serverEnv.aiGateway as { apiKey?: string; url?: string; modelName?: string }).url = undefined
  ;(serverEnv.aiGateway as { apiKey?: string; url?: string; modelName?: string }).modelName = undefined

  return run().finally(() => {
    ;(serverEnv.aiGateway as { apiKey?: string; url?: string; modelName?: string }).apiKey = original.apiKey
    ;(serverEnv.aiGateway as { apiKey?: string; url?: string; modelName?: string }).url = original.url
    ;(serverEnv.aiGateway as { apiKey?: string; url?: string; modelName?: string }).modelName = original.modelName
  })
}

describe('ai-runner', () => {
  it('runAiGeneration returns provider error when AI provider is unavailable', async () => {
    await withAiProviderDisabled(async () => {
      const result = await runAiGeneration({
        schema: z.object({ result: z.string() }),
        systemPrompt: 'test-system',
        userPrompt: 'test-user',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.type).toBe('provider')
      }
    })
  })

  it('interpretAssetInputWithAi returns fallback when AI provider is unavailable', async () => {
    await withAiProviderDisabled(async () => {
      const result = await interpretAssetInputWithAi(
        'test input',
        z.object({ intent: z.string() }),
        'test-system',
        (text) => text
      )
      expect(result).toEqual({ success: false, fallback: true })
    })
  })

  it('summarizeWithAi returns fallback when AI provider is unavailable', async () => {
    await withAiProviderDisabled(async () => {
      const result = await summarizeWithAi(
        z.object({ summary: z.string() }),
        'test-system',
        { text: 'sample' },
        100
      )
      expect(result).toEqual({ success: false, fallback: true })
    })
  })
})
