import { describe, it, expect } from 'vitest'

import { parseZhTimeText } from '@/server/services/time/zh-time-parser.pure'
import { dayjs, ASIA_SHANGHAI_TIME_ZONE } from '@/shared/time/dayjs'


describe('zh-time-parser', () => {
  const SHANGHAI_TZ = ASIA_SHANGHAI_TIME_ZONE

  describe('parseZhTimeText', () => {
    it('returns null for empty input', () => {
      const now = dayjs.tz('2026-04-15T10:00:00', SHANGHAI_TZ).toDate()
      const result = parseZhTimeText('', now)
      expect(result.timeText).toBeNull()
      expect(result.dueAt).toBeNull()
      expect(result.rangeHint).toBeNull()
    })

    it('parses 今天 and returns today date', () => {
      const now = dayjs.tz('2026-04-15T10:00:00', SHANGHAI_TZ).toDate()
      const result = parseZhTimeText('今天', now)
      expect(result.timeText).toBe('今天')
      expect(result.dueAt).not.toBeNull()
      expect(result.rangeHint).not.toBeNull()
      const expectedDate = dayjs.tz('2026-04-15', SHANGHAI_TZ).toDate()
      expect(result.rangeHint!.startsAt.getTime()).toBe(expectedDate.getTime())
      expect(result.rangeHint!.endsAt.getTime()).toBe(dayjs.tz('2026-04-16', SHANGHAI_TZ).toDate().getTime())
    })

    it('parses 明天 and returns tomorrow date', () => {
      const now = dayjs.tz('2026-04-15T10:00:00', SHANGHAI_TZ).toDate()
      const result = parseZhTimeText('明天', now)
      expect(result.timeText).toBe('明天')
      expect(result.dueAt).not.toBeNull()
      expect(result.rangeHint).not.toBeNull()
      const expectedDate = dayjs.tz('2026-04-16', SHANGHAI_TZ).toDate()
      expect(result.rangeHint!.startsAt.getTime()).toBe(expectedDate.getTime())
    })

    it('parses 后天 and returns day after tomorrow date', () => {
      const now = dayjs.tz('2026-04-15T10:00:00', SHANGHAI_TZ).toDate()
      const result = parseZhTimeText('后天', now)
      expect(result.timeText).toBe('后天')
      expect(result.dueAt).not.toBeNull()
      expect(result.rangeHint).not.toBeNull()
      const expectedDate = dayjs.tz('2026-04-17', SHANGHAI_TZ).toDate()
      expect(result.rangeHint!.startsAt.getTime()).toBe(expectedDate.getTime())
    })

    it.each([
      { input: '周一', expectedDate: '2026-04-20' },
      { input: '周二', expectedDate: '2026-04-21' },
      { input: '周三', expectedDate: '2026-04-22' },
      { input: '周四', expectedDate: '2026-04-16' },
      { input: '周五', expectedDate: '2026-04-17' },
      { input: '周六', expectedDate: '2026-04-18' },
      { input: '周日', expectedDate: '2026-04-19' },
    ])('parses 周X and returns next $expectedDate', ({ input, expectedDate }) => {
      const now = dayjs.tz('2026-04-15T10:00:00', SHANGHAI_TZ).toDate()
      const result = parseZhTimeText(input, now)
      expect(result.timeText).toBe(input)
      expect(result.dueAt).not.toBeNull()
      expect(result.rangeHint).not.toBeNull()
      const expected = dayjs.tz(expectedDate, SHANGHAI_TZ).toDate()
      expect(result.rangeHint!.startsAt.getTime()).toBe(expected.getTime())
    })

    it('parses 下周一 and returns Monday of next week', () => {
      const now = dayjs.tz('2026-04-15T10:00:00', SHANGHAI_TZ).toDate()
      const result = parseZhTimeText('下周一', now)
      expect(result.timeText).toBe('下周一')
      expect(result.dueAt).not.toBeNull()
      expect(result.rangeHint).not.toBeNull()
      const expectedDate = dayjs.tz('2026-04-20', SHANGHAI_TZ).toDate()
      expect(result.rangeHint!.startsAt.getTime()).toBe(expectedDate.getTime())
    })

    it('parses 下周五 and returns Friday of next week', () => {
      const now = dayjs.tz('2026-04-15T10:00:00', SHANGHAI_TZ).toDate()
      const result = parseZhTimeText('下周五', now)
      expect(result.timeText).toBe('下周五')
      expect(result.dueAt).not.toBeNull()
      expect(result.rangeHint).not.toBeNull()
      const expectedDate = dayjs.tz('2026-04-24', SHANGHAI_TZ).toDate()
      expect(result.rangeHint!.startsAt.getTime()).toBe(expectedDate.getTime())
    })

    it('parses 本周 and returns this week range', () => {
      const now = dayjs.tz('2026-04-15T10:00:00', SHANGHAI_TZ).toDate()
      const result = parseZhTimeText('本周', now)
      expect(result.timeText).toBe('本周')
      expect(result.dueAt).toBeNull()
      expect(result.rangeHint).not.toBeNull()
      expect(result.rangeHint!.startsAt.getTime()).toBe(dayjs.tz('2026-04-13', SHANGHAI_TZ).toDate().getTime())
      expect(result.rangeHint!.endsAt.getTime()).toBe(dayjs.tz('2026-04-20', SHANGHAI_TZ).toDate().getTime())
    })

    it('parses 下周 and returns next week range', () => {
      const now = dayjs.tz('2026-04-15T10:00:00', SHANGHAI_TZ).toDate()
      const result = parseZhTimeText('下周', now)
      expect(result.timeText).toBe('下周')
      expect(result.dueAt).toBeNull()
      expect(result.rangeHint).not.toBeNull()
      expect(result.rangeHint!.startsAt.getTime()).toBe(dayjs.tz('2026-04-20', SHANGHAI_TZ).toDate().getTime())
      expect(result.rangeHint!.endsAt.getTime()).toBe(dayjs.tz('2026-04-27', SHANGHAI_TZ).toDate().getTime())
    })

    it('parses 今天上午 with time-of-day', () => {
      const now = dayjs.tz('2026-04-15T10:00:00', SHANGHAI_TZ).toDate()
      const result = parseZhTimeText('今天上午', now)
      expect(result.timeText).toBe('今天上午')
      expect(result.dueAt).not.toBeNull()
      expect(result.rangeHint).not.toBeNull()
      const expectedDueAt = dayjs.tz('2026-04-15T09:00:00', SHANGHAI_TZ).toDate()
      expect(result.dueAt!.getTime()).toBe(expectedDueAt.getTime())
    })

    it('parses 今天下午 with time-of-day', () => {
      const now = dayjs.tz('2026-04-15T10:00:00', SHANGHAI_TZ).toDate()
      const result = parseZhTimeText('今天下午', now)
      expect(result.timeText).toBe('今天下午')
      expect(result.dueAt).not.toBeNull()
      const expectedDueAt = dayjs.tz('2026-04-15T14:00:00', SHANGHAI_TZ).toDate()
      expect(result.dueAt!.getTime()).toBe(expectedDueAt.getTime())
    })

    it('parses 今天晚上 with time-of-day', () => {
      const now = dayjs.tz('2026-04-15T10:00:00', SHANGHAI_TZ).toDate()
      const result = parseZhTimeText('今天晚上', now)
      expect(result.timeText).toBe('今天晚上')
      expect(result.dueAt).not.toBeNull()
      const expectedDueAt = dayjs.tz('2026-04-15T19:00:00', SHANGHAI_TZ).toDate()
      expect(result.dueAt!.getTime()).toBe(expectedDueAt.getTime())
    })

    it('returns null for unrecognized text', () => {
      const now = dayjs.tz('2026-04-15T10:00:00', SHANGHAI_TZ).toDate()
      const result = parseZhTimeText('没有任何时间信息', now)
      expect(result.timeText).toBeNull()
      expect(result.dueAt).toBeNull()
      expect(result.rangeHint).toBeNull()
    })
  })
})
