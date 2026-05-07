import { describe, it, expect } from 'vitest'

import { matchesSearchTimeHint } from '@/server/services/search/search.time-match.pure'

describe('search.time-match', () => {
  describe('matchesSearchTimeHint', () => {
    it('matches by due date within range', () => {
      const range = {
        startsAt: new Date('2026-04-12T16:00:00.000Z'),
        endsAt: new Date('2026-04-19T16:00:00.000Z'),
      }

      expect(
        matchesSearchTimeHint(
          { dueAt: new Date('2026-04-14T09:00:00+08:00'), timeText: null },
          range,
          '这周'
        )
      ).toBe(true)

      expect(
        matchesSearchTimeHint(
          { dueAt: new Date('2026-04-21T09:00:00+08:00'), timeText: null },
          range,
          '这周'
        )
      ).toBe(false)
    })

    it('falls back to createdAt matching when dueAt is null', () => {
      const range = {
        startsAt: new Date('2026-04-12T16:00:00.000Z'),
        endsAt: new Date('2026-04-19T16:00:00.000Z'),
      }

      expect(
        matchesSearchTimeHint(
          {
            dueAt: null,
            timeText: '本周',
            createdAt: new Date('2026-04-14T09:00:00+08:00'),
          },
          range,
          '这周'
        )
      ).toBe(true)

      expect(
        matchesSearchTimeHint(
          {
            dueAt: null,
            timeText: '下周',
            createdAt: new Date('2026-04-21T09:00:00+08:00'),
          },
          range,
          '这周'
        )
      ).toBe(false)
    })

    it('returns false when both dueAt and timeText are absent', () => {
      const range = {
        startsAt: new Date('2026-04-12T16:00:00.000Z'),
        endsAt: new Date('2026-04-19T16:00:00.000Z'),
      }

      expect(
        matchesSearchTimeHint(
          { dueAt: null, timeText: null },
          range,
          '这周'
        )
      ).toBe(false)
    })
  })
})
