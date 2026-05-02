import { dayjs, ASIA_SHANGHAI_TIME_ZONE } from './dayjs'

export function formatAbsoluteTime(
  date: Date | string | number,
  timezone: string = ASIA_SHANGHAI_TIME_ZONE
): string {
  return dayjs(date).tz(timezone).format('M月D日 HH:mm')
}

export function formatAbsoluteDateTime(
  date: Date | string | number,
  timezone: string = ASIA_SHANGHAI_TIME_ZONE
): string {
  return dayjs(date).tz(timezone).format('YYYY-MM-DD HH:mm')
}

export function formatBookmarkTime(
  date: Date | string | number,
  baseDate: Date | string | number = new Date()
): string {
  const d = dayjs(date)
  const base = dayjs(baseDate)
  const days = base.diff(d, 'day')

  if (days === 0) return '今天收藏'
  if (days === 1) return '昨天收藏'
  if (days < 7) return `${days}天前收藏`
  return d.format('M月D日') + '收藏'
}
