import { describe, it, expect } from 'vitest'

describe('dayjs timezone infrastructure', () => {
  describe('startOf(day) in Asia/Shanghai', () => {
    it('returns start of day in Asia/Shanghai timezone', async () => {
      const { dayjs, ASIA_SHANGHAI_TIME_ZONE } = await import('@/shared/time/dayjs')
      const date = dayjs.tz('2024-01-15T15:30:00Z', ASIA_SHANGHAI_TIME_ZONE)
      const startOfDay = date.startOf('day')
      expect(startOfDay.format('YYYY-MM-DD')).toBe('2024-01-15')
      expect(startOfDay.format('HH:mm:ss')).toBe('00:00:00')
    })

    it('handles midnight crossing correctly in Asia/Shanghai', async () => {
      const { dayjs, ASIA_SHANGHAI_TIME_ZONE } = await import('@/shared/time/dayjs')
      const date = dayjs.tz('2024-01-15T23:30:00+08:00', ASIA_SHANGHAI_TIME_ZONE)
      const startOfDay = date.startOf('day')
      expect(startOfDay.format('YYYY-MM-DD')).toBe('2024-01-15')
    })
  })

  describe('toISOString() consistency', () => {
    it('nowIso respects the provided date argument', async () => {
      const { nowIso } = await import('@/shared/time/dayjs')
      const fixed = new Date('2024-01-15T00:00:00.000Z')
      expect(nowIso(fixed)).toBe('2024-01-15T00:00:00.000Z')
    })

    it('returns consistent ISO string after timezone operations', async () => {
      const { dayjs, ASIA_SHANGHAI_TIME_ZONE } = await import('@/shared/time/dayjs')
      const date = dayjs.tz('2024-01-15T15:30:00Z', ASIA_SHANGHAI_TIME_ZONE)
      const startOfDay = date.startOf('day')
      const isoString = startOfDay.toISOString()
      expect(isoString).toBeDefined()
      expect(isoString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
    })

    it('preserves UTC equivalence after startOf(day)', async () => {
      const { dayjs, ASIA_SHANGHAI_TIME_ZONE } = await import('@/shared/time/dayjs')
      const shanghaiDate = dayjs.tz('2024-01-15T00:00:00', ASIA_SHANGHAI_TIME_ZONE)
      const startOfDay = shanghaiDate.startOf('day')
      expect(startOfDay.toISOString()).toBe('2024-01-14T16:00:00.000Z')
    })
  })

  describe('relativeTime in zh-CN locale', () => {
    it('returns "刚刚" for dates within the last minute', async () => {
      const { dayjs, ASIA_SHANGHAI_TIME_ZONE, toRelative } = await import('@/shared/time/dayjs')
      const now = dayjs.tz('2024-01-15T12:00:00Z', ASIA_SHANGHAI_TIME_ZONE)
      const past = dayjs.tz('2024-01-15T11:59:30Z', ASIA_SHANGHAI_TIME_ZONE)
      expect(toRelative(past, now, 'zh-CN')).toBe('刚刚')
    })

    it('returns minute-based format for minutes ago', async () => {
      const { dayjs, ASIA_SHANGHAI_TIME_ZONE, toRelative } = await import('@/shared/time/dayjs')
      const now = dayjs.tz('2024-01-15T12:00:00Z', ASIA_SHANGHAI_TIME_ZONE)
      const past = dayjs.tz('2024-01-15T11:55:00Z', ASIA_SHANGHAI_TIME_ZONE)
      expect(toRelative(past, now, 'zh-CN')).toBe('5分钟前')
    })

    it('returns hour-based format for hours ago', async () => {
      const { dayjs, ASIA_SHANGHAI_TIME_ZONE, toRelative } = await import('@/shared/time/dayjs')
      const now = dayjs.tz('2024-01-15T12:00:00Z', ASIA_SHANGHAI_TIME_ZONE)
      const past = dayjs.tz('2024-01-15T07:00:00Z', ASIA_SHANGHAI_TIME_ZONE)
      expect(toRelative(past, now, 'zh-CN')).toBe('5小时前')
    })

    it('returns "昨天" for exactly 1 day ago', async () => {
      const { dayjs, ASIA_SHANGHAI_TIME_ZONE, toRelative } = await import('@/shared/time/dayjs')
      const now = dayjs.tz('2024-01-15T12:00:00Z', ASIA_SHANGHAI_TIME_ZONE)
      const past = dayjs.tz('2024-01-14T12:00:00Z', ASIA_SHANGHAI_TIME_ZONE)
      expect(toRelative(past, now, 'zh-CN')).toBe('昨天')
    })

    it('returns day-based format for multi-day ago (2-7 days)', async () => {
      const { dayjs, ASIA_SHANGHAI_TIME_ZONE, toRelative } = await import('@/shared/time/dayjs')
      const now = dayjs.tz('2024-01-15T12:00:00Z', ASIA_SHANGHAI_TIME_ZONE)
      const past = dayjs.tz('2024-01-12T12:00:00Z', ASIA_SHANGHAI_TIME_ZONE)
      expect(toRelative(past, now, 'zh-CN')).toBe('3天前')
    })

    it('returns minute-based format for minutes in future', async () => {
      const { dayjs, ASIA_SHANGHAI_TIME_ZONE, toRelative } = await import('@/shared/time/dayjs')
      const now = dayjs.tz('2024-01-15T12:00:00Z', ASIA_SHANGHAI_TIME_ZONE)
      const future = dayjs.tz('2024-01-15T12:05:00Z', ASIA_SHANGHAI_TIME_ZONE)
      expect(toRelative(future, now, 'zh-CN')).toBe('5分钟后')
    })

    it('returns hour-based format for hours in future', async () => {
      const { dayjs, ASIA_SHANGHAI_TIME_ZONE, toRelative } = await import('@/shared/time/dayjs')
      const now = dayjs.tz('2024-01-15T12:00:00Z', ASIA_SHANGHAI_TIME_ZONE)
      const future = dayjs.tz('2024-01-15T17:00:00Z', ASIA_SHANGHAI_TIME_ZONE)
      expect(toRelative(future, now, 'zh-CN')).toBe('5小时后')
    })

    it('returns day-based format for multi-day in future (2-7 days)', async () => {
      const { dayjs, ASIA_SHANGHAI_TIME_ZONE, toRelative } = await import('@/shared/time/dayjs')
      const now = dayjs.tz('2024-01-15T12:00:00Z', ASIA_SHANGHAI_TIME_ZONE)
      const future = dayjs.tz('2024-01-18T12:00:00Z', ASIA_SHANGHAI_TIME_ZONE)
      expect(toRelative(future, now, 'zh-CN')).toBe('3天后')
    })
  })

  describe('server/lib/config/time.ts compatibility', () => {
    it('exports ASIA_SHANGHAI_TIME_ZONE constant', async () => {
      const { ASIA_SHANGHAI_TIME_ZONE } = await import('@/server/lib/config/time')
      expect(ASIA_SHANGHAI_TIME_ZONE).toBe('Asia/Shanghai')
    })

    it('ASIA_SHANGHAI_TIME_ZONE constant matches shared/time exports', async () => {
      const { ASIA_SHANGHAI_TIME_ZONE: configTz } = await import('@/server/lib/config/time')
      const { ASIA_SHANGHAI_TIME_ZONE: sharedTz } = await import('@/shared/time/dayjs')
      expect(configTz).toBe(sharedTz)
    })
  })
})
