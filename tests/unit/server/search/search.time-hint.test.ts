import { describe, it, expect } from 'vitest'
import { parseSearchTimeHint, parseSearchTimeText } from '../../../../server/search/search.time-hint.pure'

describe('search.time-hint', () => {
  describe('parseSearchTimeHint', () => {
    it('returns null for empty hint', () => {
      expect(parseSearchTimeHint(null)).toBeNull()
      expect(parseSearchTimeHint(undefined)).toBeNull()
      expect(parseSearchTimeHint('')).toBeNull()
    })

    it('parses 今天 correctly', () => {
      const now = new Date('2026-04-15T10:00:00.000Z')
      const result = parseSearchTimeHint('今天', now)
      expect(result).not.toBeNull()
      expect(result!.endsAt.getTime()).toBeGreaterThan(result!.startsAt.getTime())
    })

    it('parses 明天 correctly', () => {
      const now = new Date('2026-04-15T10:00:00.000Z')
      const result = parseSearchTimeHint('明天', now)
      expect(result).not.toBeNull()
      expect(result!.endsAt.getTime()).toBeGreaterThan(result!.startsAt.getTime())
    })

    it('parses 后天 correctly', () => {
      const now = new Date('2026-04-15T10:00:00.000Z')
      const result = parseSearchTimeHint('后天', now)
      expect(result).not.toBeNull()
      expect(result!.endsAt.getTime()).toBeGreaterThan(result!.startsAt.getTime())
    })

    it('parses 本周 and 这周 to the same range', () => {
      const now = new Date('2026-04-15T10:00:00.000Z')
      const thisWeekResult = parseSearchTimeHint('本周', now)
      const thisWeekResult2 = parseSearchTimeHint('这周', now)
      expect(thisWeekResult).not.toBeNull()
      expect(thisWeekResult2).not.toBeNull()
      expect(thisWeekResult!.startsAt.getTime()).toBe(thisWeekResult2!.startsAt.getTime())
      expect(thisWeekResult!.endsAt.getTime()).toBe(thisWeekResult2!.endsAt.getTime())
    })

    it('parses 下周 correctly', () => {
      const now = new Date('2026-04-15T10:00:00.000Z')
      const result = parseSearchTimeHint('下周', now)
      expect(result).not.toBeNull()
      expect(result!.endsAt.getTime()).toBeGreaterThan(result!.startsAt.getTime())
    })

    it('returns null for unrecognized hint', () => {
      const now = new Date('2026-04-15T10:00:00.000Z')
      expect(parseSearchTimeHint('没有任何时间信息', now)).toBeNull()
    })
  })

  describe('parseSearchTimeText', () => {
    it('returns null for empty input', () => {
      const result = parseSearchTimeText('')
      expect(result.timeText).toBeNull()
      expect(result.dueAt).toBeNull()
      expect(result.rangeHint).toBeNull()
    })

    it('extracts date and part-of-day from 今天上午', () => {
      const now = new Date('2026-04-15T10:00:00.000Z')
      const result = parseSearchTimeText('今天上午', now)
      expect(result.timeText).toBe('今天上午')
      expect(result.dueAt).not.toBeNull()
      expect(result.dueAt!.getTime()).toBe(parseSearchTimeText('今天', now).dueAt!.getTime())
    })

    it('extracts date and part-of-day from 今天下午', () => {
      const now = new Date('2026-04-15T10:00:00.000Z')
      const result = parseSearchTimeText('今天下午', now)
      expect(result.timeText).toBe('今天下午')
      expect(result.dueAt).not.toBeNull()
      const afternoonMs = result.dueAt!.getTime()
      const morningMs = parseSearchTimeText('今天', now).dueAt!.getTime()
      expect(afternoonMs - morningMs).toBe(5 * 60 * 60 * 1000)
    })

    it('extracts date and part-of-day from 今天晚上', () => {
      const now = new Date('2026-04-15T10:00:00.000Z')
      const result = parseSearchTimeText('今天晚上', now)
      expect(result.timeText).toBe('今天晚上')
      expect(result.dueAt).not.toBeNull()
      const eveningMs = result.dueAt!.getTime()
      const morningMs = parseSearchTimeText('今天', now).dueAt!.getTime()
      expect(eveningMs - morningMs).toBe(10 * 60 * 60 * 1000)
    })

    it('returns week range for 本周 without time-of-day', () => {
      const now = new Date('2026-04-15T10:00:00.000Z')
      const result = parseSearchTimeText('本周', now)
      expect(result.timeText).toBe('本周')
      expect(result.dueAt).toBeNull()
      expect(result.rangeHint).not.toBeNull()
    })

    it('parses weekday correctly', () => {
      const now = new Date('2026-04-15T10:00:00.000Z')
      const result = parseSearchTimeText('周一', now)
      expect(result.timeText).toBe('周一')
      expect(result.dueAt).not.toBeNull()
    })
  })
})
