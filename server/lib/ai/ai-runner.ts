import 'server-only'

import { generateText, Output } from 'ai'

import { getAiProvider } from './ai-provider'
import { parseAiError } from './ai.errors'
import type { AiResult } from './ai.types'
import type { ZodSchema } from 'zod'
import { ASSET_INPUT_MODEL_TIMEOUT_MS } from '@/server/lib/config/constants'

type GenerateOptions<T> = {
  schema: ZodSchema<T>
  systemPrompt: string
  userPrompt: string
  timeoutMs?: number
  maxRetries?: number
}

export async function runAiGeneration<T>({
  schema,
  systemPrompt,
  userPrompt,
  timeoutMs = ASSET_INPUT_MODEL_TIMEOUT_MS,
  maxRetries = 1,
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

export async function interpretAssetInputWithAi(
  trimmed: string,
  schema: ZodSchema<unknown>,
  systemPrompt: string,
  buildPromptFn: (text: string) => string
): Promise<{ success: true; data: unknown } | { success: false; fallback: true }> {
  const model = getAiProvider()

  if (!model) {
    return { success: false, fallback: true }
  }

  try {
    const result = await generateText({
      model,
      output: Output.object({ schema }),
      system: systemPrompt,
      prompt: buildPromptFn(trimmed),
      temperature: 0,
      maxRetries: 1,
      timeout: ASSET_INPUT_MODEL_TIMEOUT_MS,
      providerOptions: {
        alibaba: {
          enableThinking: false,
        },
      },
    })

    return { success: true, data: result.output }
  } catch (error) {
    console.warn('[ai-runner] Asset interpretation failed, using fallback', {
      error: error instanceof Error ? error.message : String(error),
    })
    return { success: false, fallback: true }
  }
}

export async function summarizeWithAi<T>(
  schema: ZodSchema<T>,
  systemPrompt: string,
  promptInput: object,
  timeoutMs: number
): Promise<{ success: true; data: T } | { success: false; fallback: true }> {
  const model = getAiProvider()

  if (!model) {
    return { success: false, fallback: true }
  }

  try {
    const result = await generateText({
      model,
      output: Output.object({ schema }),
      system: systemPrompt,
      prompt: JSON.stringify(promptInput),
      temperature: 0,
      maxRetries: 1,
      timeout: timeoutMs,
      providerOptions: {
        alibaba: {
          enableThinking: false,
        },
      },
    })

    return { success: true, data: result.output }
  } catch (error) {
    console.warn('[ai-runner] Summary generation failed, using fallback', {
      error: error instanceof Error ? error.message : String(error),
    })
    return { success: false, fallback: true }
  }
}
