import type { AiTimeoutError, AiSchemaError, AiProviderError } from './ai.types'
import { isAiTimeoutError, isAiSchemaError, isAiProviderError } from './ai.errors'

export type AiFallbackStrategy =
  | 'timeout'
  | 'schema-failure'
  | 'provider-failure'
  | 'unknown'

export type AiFallbackResult<T> =
  | { success: true; data: T; fallbackTriggered: false }
  | { success: false; fallbackTriggered: true; strategy: AiFallbackStrategy }

export function determineAiFallbackStrategy(
  error: AiTimeoutError | AiSchemaError | AiProviderError | unknown
): AiFallbackStrategy {
  if (isAiTimeoutError(error)) {
    return 'timeout'
  }
  if (isAiSchemaError(error)) {
    return 'schema-failure'
  }
  if (isAiProviderError(error)) {
    return 'provider-failure'
  }
  return 'unknown'
}

export function getAiFallbackMessage(strategy: AiFallbackStrategy): string {
  switch (strategy) {
    case 'timeout':
      return 'AI request timed out, using fallback response'
    case 'schema-failure':
      return 'AI response parsing failed, using fallback response'
    case 'provider-failure':
      return 'AI provider error, using fallback response'
    case 'unknown':
      return 'AI request failed, using fallback response'
  }
}

export function isRetryableError(strategy: AiFallbackStrategy): boolean {
  return strategy === 'timeout' || strategy === 'provider-failure'
}

export function shouldRetryAiCall(
  error: AiTimeoutError | AiSchemaError | AiProviderError | unknown,
  currentRetryCount: number,
  maxRetries: number
): boolean {
  if (currentRetryCount >= maxRetries) {
    return false
  }

  const strategy = determineAiFallbackStrategy(error)
  return isRetryableError(strategy)
}
