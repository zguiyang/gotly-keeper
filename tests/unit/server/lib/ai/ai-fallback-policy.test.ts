import { describe, it, expect } from 'vitest'
import {
  determineAiFallbackStrategy,
  getAiFallbackMessage,
  isRetryableError,
  shouldRetryAiCall,
} from '@/server/lib/ai/ai.fallback-policy'
import { AiTimeoutError, AiSchemaError, AiProviderError } from '@/server/lib/ai/ai.types'

describe('ai.fallback-policy', () => {
  describe('determineAiFallbackStrategy', () => {
    it('returns timeout for timeout errors', () => {
      const error = new AiTimeoutError('Request timed out')
      const strategy = determineAiFallbackStrategy(error)
      expect(strategy).toBe('timeout')
    })

    it('returns schema-failure for schema errors', () => {
      const error = new AiSchemaError('Schema mismatch', {})
      const strategy = determineAiFallbackStrategy(error)
      expect(strategy).toBe('schema-failure')
    })

    it('returns provider-failure for provider errors', () => {
      const error = new AiProviderError('Provider error', {})
      const strategy = determineAiFallbackStrategy(error)
      expect(strategy).toBe('provider-failure')
    })

    it('returns unknown for unknown errors', () => {
      const error = new Error('Unknown error')
      const strategy = determineAiFallbackStrategy(error)
      expect(strategy).toBe('unknown')
    })
  })

  describe('getAiFallbackMessage', () => {
    it('returns appropriate message for timeout', () => {
      const message = getAiFallbackMessage('timeout')
      expect(message.includes('timed out')).toBe(true)
    })

    it('returns appropriate message for schema-failure', () => {
      const message = getAiFallbackMessage('schema-failure')
      expect(message.includes('parsing')).toBe(true)
    })

    it('returns appropriate message for provider-failure', () => {
      const message = getAiFallbackMessage('provider-failure')
      expect(message.includes('provider')).toBe(true)
    })

    it('returns appropriate message for unknown', () => {
      const message = getAiFallbackMessage('unknown')
      expect(message.includes('failed')).toBe(true)
    })
  })

  describe('isRetryableError', () => {
    it('returns true for timeout', () => {
      expect(isRetryableError('timeout')).toBe(true)
    })

    it('returns true for provider-failure', () => {
      expect(isRetryableError('provider-failure')).toBe(true)
    })

    it('returns false for schema-failure', () => {
      expect(isRetryableError('schema-failure')).toBe(false)
    })

    it('returns false for unknown', () => {
      expect(isRetryableError('unknown')).toBe(false)
    })
  })

  describe('shouldRetryAiCall', () => {
    it('returns false when max retries reached', () => {
      const error = new AiTimeoutError('timeout')
      expect(shouldRetryAiCall(error, 3, 3)).toBe(false)
    })

    it('returns true for retryable error below max retries', () => {
      const error = new AiTimeoutError('timeout')
      expect(shouldRetryAiCall(error, 0, 3)).toBe(true)
    })

    it('returns false for schema error', () => {
      const error = new AiSchemaError('schema', {})
      expect(shouldRetryAiCall(error, 0, 3)).toBe(false)
    })
  })
})
