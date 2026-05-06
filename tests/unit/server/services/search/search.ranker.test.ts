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

    it('prefers newer asset when preferRecent is true for equally scored matches', () => {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const oneDayAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000)

      const newerAsset = makeAsset({
        id: 'new',
        originalText: '报价待办',
        title: '报价待办',
        excerpt: '报价待办',
        createdAt: oneHourAgo,
      })

      const olderAsset = makeAsset({
        id: 'old',
        originalText: '报价待办',
        title: '报价待办',
        excerpt: '报价待办',
        createdAt: oneDayAgo,
      })

      const semanticResults: SemanticCandidate[] = [
        { asset: olderAsset, distance: 0.2 },
        { asset: newerAsset, distance: 0.2 },
      ]

      const rankedWithBoost = mergeSearchResults(semanticResults, [], 5, true)

      expect(rankedWithBoost[0].asset.id).toBe('new')
    })

    it('promotes a recent match to top result even when an older match has a slightly higher score', () => {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)

      const recentAsset = makeAsset({
        id: 'recent',
        originalText: '报价待办',
        title: '报价待办',
        excerpt: '报价待办',
        createdAt: oneHourAgo,
      })

      const olderHigherScoreAsset = makeAsset({
        id: 'older-higher-score',
        originalText: '报价待办 重要',
        title: '报价待办 重要',
        excerpt: '报价待办',
        createdAt: fiveDaysAgo,
      })

      const semanticResults: SemanticCandidate[] = [
        { asset: olderHigherScoreAsset, distance: 0.1 },
        { asset: recentAsset, distance: 0.2 },
      ]

      const ranked = mergeSearchResults(semanticResults, [], 5, true)
      expect(ranked[0].asset.id).toBe('recent')
    })

    it('falls back to score ordering when no results are in the recent priority window', () => {
      const now = new Date()
      const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000)
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)

      const higherScoreOlderAsset = makeAsset({
        id: 'older-high-score',
        originalText: '报价待办 紧急',
        title: '报价待办 紧急',
        excerpt: '报价待办',
        createdAt: fiveDaysAgo,
      })

      const lowerScoreNewerAsset = makeAsset({
        id: 'newer-low-score',
        originalText: '报价待办',
        title: '报价待办',
        excerpt: '报价待办',
        createdAt: fourDaysAgo,
      })

      const semanticResults: SemanticCandidate[] = [
        { asset: lowerScoreNewerAsset, distance: 0.2 },
        { asset: higherScoreOlderAsset, distance: 0.1 },
      ]

      const ranked = mergeSearchResults(semanticResults, [], 5, true)
      expect(ranked[0].asset.id).toBe('older-high-score')
    })

    it('does not reorder when preferRecent is false', () => {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

      const highScore = makeAsset({
        id: 'high-score',
        originalText: '报价待办 紧急',
        title: '报价待办 紧急',
        excerpt: '报价待办',
        createdAt: oneHourAgo,
      })

      const lowScore = makeAsset({
        id: 'low-score',
        originalText: '无关内容',
        title: '无关内容',
        excerpt: '无关内容',
        createdAt: now,
      })

      const keywordCandidates: KeywordCandidate[] = [
        { asset: highScore, score: 10 },
        { asset: lowScore, score: 1 },
      ]

      const ranked = mergeSearchResults([], keywordCandidates, 5, false)
      expect(ranked[0].asset.id).toBe('high-score')
    })

    it('uses recency-first ordering in focus mode for explicit recent-intent queries', () => {
      const now = new Date()
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000)
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

      const recentMatch = makeAsset({
        id: 'recent-match',
        originalText: '报价待办',
        title: '报价待办',
        excerpt: '最新创建的报价待办',
        createdAt: tenMinutesAgo,
      })

      const olderHigherScoreMatch = makeAsset({
        id: 'older-higher-score',
        originalText: '报价待办 重要客户',
        title: '报价待办 重要客户',
        excerpt: '更老但关键词更多',
        createdAt: twoDaysAgo,
      })

      const keywordCandidates: KeywordCandidate[] = [
        { asset: olderHigherScoreMatch, score: 10 },
        { asset: recentMatch, score: 6 },
      ]

      const ranked = mergeSearchResults([], keywordCandidates, 1, 'focus')

      expect(ranked[0].asset.id).toBe('recent-match')
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
