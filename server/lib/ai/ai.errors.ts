import { AiTimeoutError, AiSchemaError, AiProviderError } from './ai.types'

export function isAiTimeoutError(error: unknown): error is AiTimeoutError {
  return error instanceof AiTimeoutError
}

export function isAiSchemaError(error: unknown): error is AiSchemaError {
  return error instanceof AiSchemaError
}

export function isAiProviderError(error: unknown): error is AiProviderError {
  return error instanceof AiProviderError
}

export function isAiError(error: unknown): error is AiTimeoutError | AiSchemaError | AiProviderError {
  return isAiTimeoutError(error) || isAiSchemaError(error) || isAiProviderError(error)
}

export function parseAiError(error: unknown): AiTimeoutError | AiSchemaError | AiProviderError {
  if (error instanceof Error) {
    if (error.message.includes('timeout')) {
      return new AiTimeoutError(error.message)
    }
    if (error.name === 'AiSchemaError' || error.name === 'ZodError') {
      return new AiSchemaError(error.message, error)
    }
    return new AiProviderError(error.message, error)
  }
  return new AiProviderError(String(error), error)
}
