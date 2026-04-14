import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  determineAiFallbackStrategy,
  getAiFallbackMessage,
  isRetryableError,
  shouldRetryAiCall,
} from '../ai.fallback-policy'
import { AiTimeoutError, AiSchemaError, AiProviderError } from '../ai.types'

describe('ai.fallback-policy', () => {
  describe('determineAiFallbackStrategy', () => {
    it('returns timeout for timeout errors', () => {
      const error = new AiTimeoutError('Request timed out')
      const strategy = determineAiFallbackStrategy(error)
      assert.equal(strategy, 'timeout')
    })

    it('returns schema-failure for schema errors', () => {
      const error = new AiSchemaError('Schema mismatch', {})
      const strategy = determineAiFallbackStrategy(error)
      assert.equal(strategy, 'schema-failure')
    })

    it('returns provider-failure for provider errors', () => {
      const error = new AiProviderError('Provider error', {})
      const strategy = determineAiFallbackStrategy(error)
      assert.equal(strategy, 'provider-failure')
    })

    it('returns unknown for unknown errors', () => {
      const error = new Error('Unknown error')
      const strategy = determineAiFallbackStrategy(error)
      assert.equal(strategy, 'unknown')
    })
  })

  describe('getAiFallbackMessage', () => {
    it('returns appropriate message for timeout', () => {
      const message = getAiFallbackMessage('timeout')
      assert.ok(message.includes('timed out'))
    })

    it('returns appropriate message for schema-failure', () => {
      const message = getAiFallbackMessage('schema-failure')
      assert.ok(message.includes('parsing'))
    })

    it('returns appropriate message for provider-failure', () => {
      const message = getAiFallbackMessage('provider-failure')
      assert.ok(message.includes('provider'))
    })

    it('returns appropriate message for unknown', () => {
      const message = getAiFallbackMessage('unknown')
      assert.ok(message.includes('failed'))
    })
  })

  describe('isRetryableError', () => {
    it('returns true for timeout', () => {
      assert.equal(isRetryableError('timeout'), true)
    })

    it('returns true for provider-failure', () => {
      assert.equal(isRetryableError('provider-failure'), true)
    })

    it('returns false for schema-failure', () => {
      assert.equal(isRetryableError('schema-failure'), false)
    })

    it('returns false for unknown', () => {
      assert.equal(isRetryableError('unknown'), false)
    })
  })

  describe('shouldRetryAiCall', () => {
    it('returns false when max retries reached', () => {
      const error = new AiTimeoutError('timeout')
      assert.equal(shouldRetryAiCall(error, 3, 3), false)
    })

    it('returns true for retryable error below max retries', () => {
      const error = new AiTimeoutError('timeout')
      assert.equal(shouldRetryAiCall(error, 0, 3), true)
    })

    it('returns false for schema error', () => {
      const error = new AiSchemaError('schema', {})
      assert.equal(shouldRetryAiCall(error, 0, 3), false)
    })
  })
})
