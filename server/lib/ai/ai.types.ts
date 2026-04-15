import type { LanguageModel } from 'ai'

export type AiProvider = LanguageModel | null

export type AiModelOptions = {
  apiKey: string
  url: string
  modelName: string
}

export type AiErrorType = 'timeout' | 'schema' | 'provider' | 'unknown'

export class AiTimeoutError extends Error {
  readonly type: AiErrorType = 'timeout'
  constructor(message: string) {
    super(message)
    this.name = 'AiTimeoutError'
  }
}

export class AiSchemaError extends Error {
  readonly type: AiErrorType = 'schema'
  readonly cause: unknown
  constructor(message: string, cause: unknown) {
    super(message)
    this.name = 'AiSchemaError'
    this.cause = cause
  }
}

export class AiProviderError extends Error {
  readonly type: AiErrorType = 'provider'
  readonly cause: unknown
  constructor(message: string, cause: unknown) {
    super(message)
    this.name = 'AiProviderError'
    this.cause = cause
  }
}

export type AiResult<T> =
  | { success: true; data: T }
  | { success: false; error: AiTimeoutError | AiSchemaError | AiProviderError }
