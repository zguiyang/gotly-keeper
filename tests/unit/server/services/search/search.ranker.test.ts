import { describe, it, expect } from 'vitest'

import { mergeSearchResults } from '@/server/services/search/search.ranker'

import type { SemanticCandidate, KeywordCandidate } from '@/server/services/search/search.types'

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
          asset: {
            id: '1',
            userId: 'user1',
            originalText: 'test',
            type: 'note',
            url: null,
            timeText: null,
            dueAt: null,
            completedAt: null,
            bookmarkMeta: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
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
          asset: {
            id: '1',
            userId: 'user1',
            originalText: 'test',
            type: 'note',
            url: null,
            timeText: null,
            dueAt: null,
            completedAt: null,
            bookmarkMeta: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
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
          asset: {
            id: '1',
            userId: 'user1',
            originalText: 'test1',
            type: 'note',
            url: null,
            timeText: null,
            dueAt: null,
            completedAt: null,
            bookmarkMeta: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          distance: 0.1,
        },
        {
          asset: {
            id: '2',
            userId: 'user1',
            originalText: 'test2',
            type: 'note',
            url: null,
            timeText: null,
            dueAt: null,
            completedAt: null,
            bookmarkMeta: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          distance: 0.2,
        },
        {
          asset: {
            id: '3',
            userId: 'user1',
            originalText: 'test3',
            type: 'note',
            url: null,
            timeText: null,
            dueAt: null,
            completedAt: null,
            bookmarkMeta: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          distance: 0.3,
        },
      ]

      const ranked = mergeSearchResults(semanticResults, [], 2)
      expect(ranked.length).toBe(2)
    })

    it('sorts by score descending', () => {
      const semanticResults: SemanticCandidate[] = [
        {
          asset: {
            id: '1',
            userId: 'user1',
            originalText: 'low score',
            type: 'note',
            url: null,
            timeText: null,
            dueAt: null,
            completedAt: null,
            bookmarkMeta: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          distance: 0.5,
        },
        {
          asset: {
            id: '2',
            userId: 'user1',
            originalText: 'high score',
            type: 'note',
            url: null,
            timeText: null,
            dueAt: null,
            completedAt: null,
            bookmarkMeta: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          distance: 0.1,
        },
      ]

      const ranked = mergeSearchResults(semanticResults, [], 5)
      expect(ranked[0].asset.id).toBe('2')
      expect(ranked[1].asset.id).toBe('1')
    })
  })
})
