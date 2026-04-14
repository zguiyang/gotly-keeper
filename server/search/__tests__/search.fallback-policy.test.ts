import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  determineSearchFallbackStrategy,
  shouldFallbackToKeyword,
  createSearchFallbackMessage,
} from '../search.fallback-policy'

describe('search.fallback-policy', () => {
  describe('determineSearchFallbackStrategy', () => {
    it('returns keyword-only when semantic not attempted', () => {
      const strategy = determineSearchFallbackStrategy(false, false, 0, 5)
      assert.equal(strategy, 'keyword-only')
    })

    it('returns keyword-only when semantic failed', () => {
      const strategy = determineSearchFallbackStrategy(true, true, 0, 5)
      assert.equal(strategy, 'keyword-only')
    })

    it('returns empty when both results are zero', () => {
      const strategy = determineSearchFallbackStrategy(true, false, 0, 0)
      assert.equal(strategy, 'empty')
    })

    it('returns keyword-only when semantic has no results', () => {
      const strategy = determineSearchFallbackStrategy(true, false, 0, 5)
      assert.equal(strategy, 'keyword-only')
    })

    it('returns hybrid when both have results', () => {
      const strategy = determineSearchFallbackStrategy(true, false, 5, 5)
      assert.equal(strategy, 'hybrid')
    })
  })

  describe('shouldFallbackToKeyword', () => {
    it('returns true when semantic failed', () => {
      assert.equal(shouldFallbackToKeyword(true, 5), true)
    })

    it('returns true when semantic has no results', () => {
      assert.equal(shouldFallbackToKeyword(false, 0), true)
    })

    it('returns false when semantic has results', () => {
      assert.equal(shouldFallbackToKeyword(false, 5), false)
    })
  })

  describe('createSearchFallbackMessage', () => {
    it('returns message for keyword-only strategy', () => {
      const message = createSearchFallbackMessage('keyword-only', 'test query')
      assert.ok(message?.includes('test query'))
    })

    it('returns message for empty strategy', () => {
      const message = createSearchFallbackMessage('empty', 'test query')
      assert.ok(message?.includes('test query'))
    })

    it('returns null for hybrid strategy', () => {
      const message = createSearchFallbackMessage('hybrid', 'test query')
      assert.equal(message, null)
    })

    it('returns null for semantic-only strategy', () => {
      const message = createSearchFallbackMessage('semantic-only', 'test query')
      assert.equal(message, null)
    })
  })
})
