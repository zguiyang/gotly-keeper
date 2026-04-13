import assert from 'node:assert/strict'
import test from 'node:test'

import { matchesAssetSearchTimeHint } from '../assets.search-time'
import { parseAssetSearchTimeHint } from '../assets.time'

const now = new Date('2026-04-13T10:00:00+08:00')

test('matches todo search time hints by due date range and broad time text', () => {
  const thisWeekRange = parseAssetSearchTimeHint('这周', now)

  assert.ok(thisWeekRange)

  assert.equal(
    matchesAssetSearchTimeHint(
      { dueAt: new Date('2026-04-14T09:00:00+08:00'), timeText: null },
      thisWeekRange,
      '这周'
    ),
    true
  )

  assert.equal(
    matchesAssetSearchTimeHint(
      { dueAt: new Date('2026-04-21T09:00:00+08:00'), timeText: null },
      thisWeekRange,
      '这周'
    ),
    false
  )

  assert.equal(
    matchesAssetSearchTimeHint(
      { dueAt: null, timeText: '本周' },
      thisWeekRange,
      '这周'
    ),
    true
  )

  assert.equal(
    matchesAssetSearchTimeHint(
      { dueAt: null, timeText: '这周' },
      thisWeekRange,
      '这周'
    ),
    true
  )

  assert.equal(
    matchesAssetSearchTimeHint(
      { dueAt: null, timeText: '下周' },
      thisWeekRange,
      '这周'
    ),
    false
  )
})
