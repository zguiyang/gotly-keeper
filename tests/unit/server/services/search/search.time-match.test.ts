import { describe, it, expect } from 'vitest'
import { matchesSearchTimeHint, getSearchTimeTextAliases } from '@/server/services/search/search.time-match.pure'

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

    it('falls back to timeText matching when dueAt is null', () => {
      const range = {
        startsAt: new Date('2026-04-12T16:00:00.000Z'),
        endsAt: new Date('2026-04-19T16:00:00.000Z'),
      }

      expect(
        matchesSearchTimeHint(
          { dueAt: null, timeText: '本周' },
          range,
          '这周'
        )
      ).toBe(true)

      expect(
        matchesSearchTimeHint(
          { dueAt: null, timeText: '下周' },
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

  describe('getSearchTimeTextAliases', () => {
    it('returns empty array for null/undefined', () => {
      expect(getSearchTimeTextAliases(null)).toEqual([])
      expect(getSearchTimeTextAliases(undefined)).toEqual([])
    })

    it('returns empty array for empty string', () => {
      expect(getSearchTimeTextAliases('')).toEqual([])
    })

    it('returns single element for normal hint', () => {
      expect(getSearchTimeTextAliases('今天')).toEqual(['今天'])
      expect(getSearchTimeTextAliases('明天')).toEqual(['明天'])
    })

    it('returns both aliases for 本周/这周', () => {
      expect(getSearchTimeTextAliases('本周')).toEqual(['这周', '本周'])
      expect(getSearchTimeTextAliases('这周')).toEqual(['这周', '本周'])
    })
  })
})
