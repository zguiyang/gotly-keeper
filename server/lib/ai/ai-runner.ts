import 'server-only'

import { generateText, Output } from 'ai'

import { ASSET_INPUT_MODEL_TIMEOUT_MS } from '@/server/lib/config/constants'

import { getAiProvider } from './ai-provider'
import { parseAiError } from './ai.errors'
import { AiSchemaError, type AiTimeoutError, type AiProviderError, type AiResult } from './ai.types'

import type { ZodSchema } from 'zod'

type GenerateOptions<T> = {
  schema: ZodSchema<T>
  systemPrompt: string
  userPrompt: string
  timeoutMs?: number
  maxRetries?: number
  abortSignal?: AbortSignal
  enableThinking?: boolean
}

export type AiRecoveryStrategy = 'retry' | 'retry-stricter' | 'strip-and-retry' | 'fallback'

function determineRecoveryStrategy(error: AiTimeoutError | AiSchemaError | AiProviderError): AiRecoveryStrategy {
  if (error instanceof AiSchemaError) {
    return 'strip-and-retry'
  }

  if (error.type === 'timeout') {
    return 'fallback'
  }

  return 'retry'
}

function stripMarkdownWrapper(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
}

export async function runAiGeneration<T>({
  schema,
  systemPrompt,
  userPrompt,
  timeoutMs = ASSET_INPUT_MODEL_TIMEOUT_MS,
  maxRetries = 1,
  abortSignal,
  enableThinking = false,
}: GenerateOptions<T>): Promise<AiResult<T>> {
  const model = getAiProvider()

  if (!model) {
    return {
      success: false,
      error: new (await import('./ai.types')).AiProviderError('AI provider not configured', null),
    }
  }

  const attempt = async (prompt: string): Promise<AiResult<T>> => {
    try {
      const result = await generateText({
        model,
        output: Output.object({ schema }),
        system: systemPrompt,
        prompt,
        temperature: 0,
        maxRetries,
        timeout: timeoutMs,
        abortSignal,
        providerOptions: {
          alibaba: {
            enableThinking,
          },
        },
      })

      return { success: true, data: result.output }
    } catch (error) {
      const parsedError = parseAiError(error)
      return { success: false, error: parsedError }
    }
  }

  const firstResult = await attempt(userPrompt)

  if (firstResult.success) {
    return firstResult
  }

  const strategy = determineRecoveryStrategy(firstResult.error)

  if (strategy === 'strip-and-retry') {
    const stripped = stripMarkdownWrapper(userPrompt)
    if (stripped !== userPrompt) {
      const retryResult = await attempt(stripped)
      if (retryResult.success) {
        return retryResult
      }
    }
  }

  if (strategy === 'retry' || strategy === 'retry-stricter') {
    const stricterPrompt = strategy === 'retry-stricter'
      ? `Return ONLY valid JSON matching the schema. Do not add any formatting or markdown.\n\n${userPrompt}`
      : userPrompt

    const retryResult = await attempt(stricterPrompt)
    if (retryResult.success) {
      return retryResult
    }
  }

  return firstResult
}

export { stripMarkdownWrapper }
