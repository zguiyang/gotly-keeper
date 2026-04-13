import assert from 'node:assert/strict'
import test from 'node:test'

import { buildAssetSearchPathLog } from '../assets.search-logging'

test('builds a sanitized asset search path log payload', () => {
  const payload = buildAssetSearchPathLog({
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

  assert.equal(payload.queryLength, '我上次收藏的 AI 文章在哪'.length)
  assert.equal(payload.typeHint, 'link')
  assert.equal(payload.timeHintPresent, true)
  assert.equal(payload.completionHint, null)
  assert.equal(payload.timeFilterApplied, true)
  assert.equal(payload.semanticAttempted, true)
  assert.equal(payload.semanticFailed, false)
  assert.equal(payload.semanticCandidateCount, 2)
  assert.equal(payload.keywordCandidateCount, 3)
  assert.equal(payload.returnedCount, 4)
  assert.equal('query' in payload, false)
})