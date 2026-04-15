import { describe, it, expect } from 'vitest'
import {
  determineSearchFallbackStrategy,
  shouldFallbackToKeyword,
  createSearchFallbackMessage,
} from '../../../server/search/search.fallback-policy'

describe('search.fallback-policy', () => {
  describe('determineSearchFallbackStrategy', () => {
    it('returns keyword-only when semantic not attempted', () => {
      const strategy = determineSearchFallbackStrategy(false, false, 0, 5)
      expect(strategy).toBe('keyword-only')
    })

    it('returns keyword-only when semantic failed', () => {
      const strategy = determineSearchFallbackStrategy(true, true, 0, 5)
      expect(strategy).toBe('keyword-only')
    })

    it('returns empty when both results are zero', () => {
      const strategy = determineSearchFallbackStrategy(true, false, 0, 0)
      expect(strategy).toBe('empty')
    })

    it('returns keyword-only when semantic has no results', () => {
      const strategy = determineSearchFallbackStrategy(true, false, 0, 5)
      expect(strategy).toBe('keyword-only')
    })

    it('returns hybrid when both have results', () => {
      const strategy = determineSearchFallbackStrategy(true, false, 5, 5)
      expect(strategy).toBe('hybrid')
    })
  })

  describe('shouldFallbackToKeyword', () => {
    it('returns true when semantic failed', () => {
      expect(shouldFallbackToKeyword(true, 5)).toBe(true)
    })

    it('returns true when semantic has no results', () => {
      expect(shouldFallbackToKeyword(false, 0)).toBe(true)
    })

    it('returns false when semantic has results', () => {
      expect(shouldFallbackToKeyword(false, 5)).toBe(false)
    })
  })

  describe('createSearchFallbackMessage', () => {
    it('returns message for keyword-only strategy', () => {
      const message = createSearchFallbackMessage('keyword-only', 'test query')
      expect(message?.includes('test query')).toBe(true)
    })

    it('returns message for empty strategy', () => {
      const message = createSearchFallbackMessage('empty', 'test query')
      expect(message?.includes('test query')).toBe(true)
    })

    it('returns null for hybrid strategy', () => {
      const message = createSearchFallbackMessage('hybrid', 'test query')
      expect(message).toBe(null)
    })

    it('returns null for semantic-only strategy', () => {
      const message = createSearchFallbackMessage('semantic-only', 'test query')
      expect(message).toBe(null)
    })
  })
})
