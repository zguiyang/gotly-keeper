import { describe, it, expect } from 'vitest'
import { z } from 'zod'

import { runAiGeneration } from '@/server/lib/ai/ai-runner'
import { serverEnv } from '@/server/lib/env'

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
})
