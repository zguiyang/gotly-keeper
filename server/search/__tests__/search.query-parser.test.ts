import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { normalizeSearchText, getAssetSearchTerms, getTypeHintScore, scoreAssetForQuery } from '../search.query-parser'

describe('search.query-parser', () => {
  describe('normalizeSearchText', () => {
    it('converts to lowercase', () => {
      assert.equal(normalizeSearchText('Hello World'), 'hello world')
    })

    it('removes Chinese punctuation', () => {
      assert.equal(normalizeSearchText('你好，世界！'), '你好 世界')
    })

    it('removes English punctuation', () => {
      assert.equal(normalizeSearchText('test, (example).'), 'test example')
    })

    it('collapses multiple spaces', () => {
      assert.equal(normalizeSearchText('hello    world'), 'hello world')
    })

    it('trims whitespace', () => {
      assert.equal(normalizeSearchText('  hello  '), 'hello')
    })
  })

  describe('getAssetSearchTerms', () => {
    it('filters terms shorter than 2 characters', () => {
      const terms = getAssetSearchTerms('a b cd ef')
      assert.deepEqual(terms, ['cd', 'ef'])
    })

    it('removes filler words', () => {
      const terms = getAssetSearchTerms('帮我找一下关于工作的事情')
      assert.equal(terms.includes('帮我'), false)
      assert.equal(terms.includes('找一下'), false)
    })

    it('limits to 8 terms', () => {
      const terms = getAssetSearchTerms('北京 上海 广州 深圳 成都 武汉 西安 重庆 杭州')
      assert.equal(terms.length <= 8, true)
    })

    it('returns unique terms', () => {
      const terms = getAssetSearchTerms('北京 北京 上海 上海')
      assert.deepEqual(terms, ['北京', '上海'])
    })
  })

  describe('getTypeHintScore', () => {
    it('returns 2 for matching note terms', () => {
      assert.equal(getTypeHintScore('记录一下', 'note'), 2)
    })

    it('returns 2 for matching link terms', () => {
      assert.equal(getTypeHintScore('书签这个链接', 'link'), 2)
    })

    it('returns 2 for matching todo terms', () => {
      assert.equal(getTypeHintScore('待办事项', 'todo'), 2)
    })

    it('returns 0 for non-matching types', () => {
      assert.equal(getTypeHintScore('记录一下', 'todo'), 0)
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
      assert.equal(score > 0, true)
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
      assert.equal(score1 > score2, true)
    })
  })
})
