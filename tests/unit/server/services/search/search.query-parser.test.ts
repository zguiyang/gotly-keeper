import { describe, it, expect } from 'vitest'
import { normalizeSearchText, getAssetSearchTerms, getTypeHintScore, scoreAssetForQuery } from '@/server/services/search/search.query-parser'

describe('search.query-parser', () => {
  describe('normalizeSearchText', () => {
    it('converts to lowercase', () => {
      expect(normalizeSearchText('Hello World')).toBe('hello world')
    })

    it('removes Chinese punctuation', () => {
      expect(normalizeSearchText('你好，世界！')).toBe('你好 世界')
    })

    it('removes English punctuation', () => {
      expect(normalizeSearchText('test, (example).')).toBe('test example')
    })

    it('collapses multiple spaces', () => {
      expect(normalizeSearchText('hello    world')).toBe('hello world')
    })

    it('trims whitespace', () => {
      expect(normalizeSearchText('  hello  ')).toBe('hello')
    })
  })

  describe('getAssetSearchTerms', () => {
    it('filters terms shorter than 2 characters', () => {
      const terms = getAssetSearchTerms('a b cd ef')
      expect(terms).toEqual(['cd', 'ef'])
    })

    it('removes filler words', () => {
      const terms = getAssetSearchTerms('帮我找一下关于工作的事情')
      expect(terms.includes('帮我')).toBe(false)
      expect(terms.includes('找一下')).toBe(false)
    })

    it('limits to 8 terms', () => {
      const terms = getAssetSearchTerms('北京 上海 广州 深圳 成都 武汉 西安 重庆 杭州')
      expect(terms.length <= 8).toBe(true)
    })

    it('returns unique terms', () => {
      const terms = getAssetSearchTerms('北京 北京 上海 上海')
      expect(terms).toEqual(['北京', '上海'])
    })
  })

  describe('getTypeHintScore', () => {
    it('returns 2 for matching note terms', () => {
      expect(getTypeHintScore('记录一下', 'note')).toBe(2)
    })

    it('returns 2 for matching link terms', () => {
      expect(getTypeHintScore('书签这个链接', 'link')).toBe(2)
    })

    it('returns 2 for matching todo terms', () => {
      expect(getTypeHintScore('待办事项', 'todo')).toBe(2)
    })

    it('returns 0 for non-matching types', () => {
      expect(getTypeHintScore('记录一下', 'todo')).toBe(0)
    })
  })

  describe('scoreAssetForQuery', () => {
    it('scores based on term matches', () => {
      const asset = {
        originalText: '工作会议记录',
        url: null,
        timeText: null,
        type: 'note' as const,
      }
      const terms = ['工作', '会议']
      const score = scoreAssetForQuery(asset, '工作会议', terms)
      expect(score > 0).toBe(true)
    })

    it('gives bonus for long term matches', () => {
      const asset1 = {
        originalText: '项目计划',
        url: null,
        timeText: null,
        type: 'note' as const,
      }
      const asset2 = {
        originalText: '项目',
        url: null,
        timeText: null,
        type: 'note' as const,
      }
      const terms = ['项目计划']
      const score1 = scoreAssetForQuery(asset1, '项目计划', terms)
      const score2 = scoreAssetForQuery(asset2, '项目', terms)
      expect(score1 > score2).toBe(true)
    })
  })
})
