import { describe, it, expect } from 'vitest'
import { matchesAssetSearchTimeHint } from '../../../server/assets/assets.search-time.pure'

describe('assets.search-time', () => {
  it('matches todo search time hints by due date range and broad time text', () => {
    const thisWeekRange = {
      startsAt: new Date('2026-04-12T16:00:00.000Z'),
      endsAt: new Date('2026-04-19T16:00:00.000Z'),
    }

    expect(
      matchesAssetSearchTimeHint(
        { dueAt: new Date('2026-04-14T09:00:00+08:00'), timeText: null },
        thisWeekRange,
        '这周'
      )
    ).toBe(true)

    expect(
      matchesAssetSearchTimeHint(
        { dueAt: new Date('2026-04-21T09:00:00+08:00'), timeText: null },
        thisWeekRange,
        '这周'
      )
    ).toBe(false)

    expect(
      matchesAssetSearchTimeHint(
        { dueAt: null, timeText: '本周' },
        thisWeekRange,
        '这周'
      )
    ).toBe(true)

    expect(
      matchesAssetSearchTimeHint(
        { dueAt: null, timeText: '这周' },
        thisWeekRange,
        '这周'
      )
    ).toBe(true)

    expect(
      matchesAssetSearchTimeHint(
        { dueAt: null, timeText: '下周' },
        thisWeekRange,
        '这周'
      )
    ).toBe(false)
  })
})
