import 'server-only'

import { generateText, Output } from 'ai'

import { ASSET_INPUT_MODEL_TIMEOUT_MS } from '@/server/lib/config/constants'

import { getAiProvider } from './ai-provider'
import { parseAiError } from './ai.errors'

import type { AiResult } from './ai.types'
import type { ZodSchema } from 'zod'

type GenerateOptions<T> = {
  schema: ZodSchema<T>
  systemPrompt: string
  userPrompt: string
  timeoutMs?: number
  maxRetries?: number
  abortSignal?: AbortSignal
}

export async function runAiGeneration<T>({
  schema,
  systemPrompt,
  userPrompt,
  timeoutMs = ASSET_INPUT_MODEL_TIMEOUT_MS,
  maxRetries = 1,
  abortSignal,
}: GenerateOptions<T>): Promise<AiResult<T>> {
  const model = getAiProvider()

  if (!model) {
    return {
      success: false,
      error: new (await import('./ai.types')).AiProviderError('AI provider not configured', null),
    }
  }

  try {
    const result = await generateText({
      model,
      output: Output.object({ schema }),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0,
      maxRetries,
      timeout: timeoutMs,
      abortSignal,
      providerOptions: {
        alibaba: {
          enableThinking: false,
        },
      },
    })

    return { success: true, data: result.output }
  } catch (error) {
    const parsedError = parseAiError(error)
    return { success: false, error: parsedError }
  }
}
