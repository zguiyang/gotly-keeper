import assert from 'node:assert/strict'
import test from 'node:test'

import {
  detectExplicitSummaryIntent,
  resolveExplicitSummaryTarget,
} from '../assets.summary-intent.pure'

test('detects supported explicit summary intents', () => {
  assert.deepEqual(detectExplicitSummaryIntent('复盘一下未完成待办'), {
    summaryTarget: 'unfinished_todos',
  })
  assert.deepEqual(detectExplicitSummaryIntent('总结最近笔记'), {
    summaryTarget: 'recent_notes',
  })
  assert.deepEqual(detectExplicitSummaryIntent('总结最近收藏的链接'), {
    summaryTarget: 'recent_bookmarks',
  })
})

test('does not detect ambiguous summary requests', () => {
  assert.equal(detectExplicitSummaryIntent('总结一下 AI'), null)
  assert.equal(detectExplicitSummaryIntent('总结一下'), null)
  assert.equal(detectExplicitSummaryIntent('帮我总结这个链接 https://example.com/a'), null)
  assert.equal(detectExplicitSummaryIntent('最近 AI 有什么'), null)
  assert.equal(detectExplicitSummaryIntent('总结已完成待办'), null)
  assert.equal(detectExplicitSummaryIntent('总结所有待办'), null)
  assert.equal(detectExplicitSummaryIntent('总结最近待办'), null)
})

test('does not trust a model summary target without explicit user phrasing', () => {
  assert.equal(resolveExplicitSummaryTarget('总结最近笔记'), 'recent_notes')
  assert.equal(resolveExplicitSummaryTarget('总结一下 AI'), null)
  assert.equal(resolveExplicitSummaryTarget('总结已完成待办'), null)
})
