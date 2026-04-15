import { describe, it, expect } from 'vitest'
import { buildSearchPathLog } from '../../../server/search/search.logging.pure'

describe('assets.search-logging', () => {
  it('builds a sanitized asset search path log payload', () => {
    const payload = buildSearchPathLog({
      query: '我上次收藏的 AI 文章在哪',
      typeHint: 'link',
      timeHint: '这周',
      completionHint: null,
      timeFilterApplied: true,
      semanticAttempted: true,
      semanticFailed: false,
      semanticCandidateCount: 2,
      keywordCandidateCount: 3,
      returnedCount: 4,
    })

    expect(payload.queryLength).toBe('我上次收藏的 AI 文章在哪'.length)
    expect(payload.typeHint).toBe('link')
    expect(payload.timeHintPresent).toBe(true)
    expect(payload.completionHint).toBe(null)
    expect(payload.timeFilterApplied).toBe(true)
    expect(payload.semanticAttempted).toBe(true)
    expect(payload.semanticFailed).toBe(false)
    expect(payload.semanticCandidateCount).toBe(2)
    expect(payload.keywordCandidateCount).toBe(3)
    expect(payload.returnedCount).toBe(4)
    expect('query' in payload).toBe(false)
  })
})
