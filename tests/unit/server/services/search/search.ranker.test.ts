import { describe, it, expect } from 'vitest'

import { mergeSearchResults } from '@/server/services/search/search.ranker'

import type { SemanticCandidate, KeywordCandidate } from '@/server/services/search/search.types'
import type { AssetListItem } from '@/shared/assets/assets.types'

const makeAsset = (overrides: Partial<AssetListItem> = {}): AssetListItem => ({
  id: '1',
  originalText: 'test',
  title: 'test',
  excerpt: 'test',
  type: 'note',
  url: null,
  timeText: null,
  dueAt: null,
  completed: false,
  createdAt: new Date(),
  ...overrides,
})

describe('search.ranker', () => {
  describe('mergeSearchResults', () => {
    it('returns empty results when both inputs are empty', () => {
      const ranked = mergeSearchResults([], [], 5)
      expect(ranked).toEqual([])
    })

    it('returns keyword-only results when semantic is empty', () => {
      const keywordCandidates: KeywordCandidate[] = [
        {
          asset: {
            id: '1',
            originalText: 'test',
            title: 'test',
            excerpt: 'test',
            type: 'note',
            url: null,
            timeText: null,
            dueAt: null,
            completed: false,
            createdAt: new Date(),
          },
          score: 10,
        },
      ]

      const ranked = mergeSearchResults([], keywordCandidates, 5)
      expect(ranked.length).toBe(1)
      expect(ranked[0].source).toBe('keyword')
    })

    it('returns semantic results when keyword is empty', () => {
      const semanticResults: SemanticCandidate[] = [
        {
          asset: makeAsset(),
          distance: 0.1,
        },
      ]

      const ranked = mergeSearchResults(semanticResults, [], 5)
      expect(ranked.length).toBe(1)
      expect(ranked[0].source).toBe('semantic')
    })

    it('merges results from both sources', () => {
      const semanticResults: SemanticCandidate[] = [
        {
          asset: makeAsset(),
          distance: 0.1,
        },
      ]

      const keywordCandidates: KeywordCandidate[] = [
        {
          asset: {
            id: '1',
            originalText: 'test',
            title: 'test',
            excerpt: 'test',
            type: 'note',
            url: null,
            timeText: null,
            dueAt: null,
            completed: false,
            createdAt: new Date(),
          },
          score: 10,
        },
      ]

      const ranked = mergeSearchResults(semanticResults, keywordCandidates, 5)
      expect(ranked.length).toBe(1)
      expect(ranked[0].source).toBe('merged')
    })

    it('limits results to specified limit', () => {
      const semanticResults: SemanticCandidate[] = [
        {
          asset: makeAsset({ id: '1', originalText: 'test1', title: 'test1', excerpt: 'test1' }),
          distance: 0.1,
        },
        {
          asset: makeAsset({ id: '2', originalText: 'test2', title: 'test2', excerpt: 'test2' }),
          distance: 0.2,
        },
        {
          asset: makeAsset({ id: '3', originalText: 'test3', title: 'test3', excerpt: 'test3' }),
          distance: 0.3,
        },
      ]

      const ranked = mergeSearchResults(semanticResults, [], 2)
      expect(ranked.length).toBe(2)
    })

    it('sorts by score descending', () => {
      const semanticResults: SemanticCandidate[] = [
        {
          asset: makeAsset({ id: '1', originalText: 'low score', title: 'low score', excerpt: 'low score' }),
          distance: 0.5,
        },
        {
          asset: makeAsset({ id: '2', originalText: 'high score', title: 'high score', excerpt: 'high score' }),
          distance: 0.1,
        },
      ]

      const ranked = mergeSearchResults(semanticResults, [], 5)
      expect(ranked[0].asset.id).toBe('2')
      expect(ranked[1].asset.id).toBe('1')
    })
  })
})
