import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mergeSearchResults } from '../search.ranker'
import type { SemanticCandidate, KeywordCandidate } from '../search.types'

describe('search.ranker', () => {
  describe('mergeSearchResults', () => {
    it('returns empty results when both inputs are empty', () => {
      const ranked = mergeSearchResults([], [], 5)
      assert.deepEqual(ranked, [])
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
      assert.equal(ranked.length, 1)
      assert.equal(ranked[0].source, 'keyword')
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
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          distance: 0.1,
        },
      ]

      const ranked = mergeSearchResults(semanticResults, [], 5)
      assert.equal(ranked.length, 1)
      assert.equal(ranked[0].source, 'semantic')
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
      assert.equal(ranked.length, 1)
      assert.equal(ranked[0].source, 'merged')
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
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          distance: 0.3,
        },
      ]

      const ranked = mergeSearchResults(semanticResults, [], 2)
      assert.equal(ranked.length, 2)
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
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          distance: 0.1,
        },
      ]

      const ranked = mergeSearchResults(semanticResults, [], 5)
      assert.equal(ranked[0].asset.id, '2')
      assert.equal(ranked[1].asset.id, '1')
    })
  })
})
