import { dayjs, ASIA_SHANGHAI_TIME_ZONE } from './dayjs'

export function formatAbsoluteTime(
  date: Date | string | number,
  timezone: string = ASIA_SHANGHAI_TIME_ZONE
): string {
  return dayjs(date).tz(timezone).format('MMM D HH:mm')
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

  if (days === 0) return 'Saved today'
  if (days === 1) return 'Saved yesterday'
  if (days < 7) return `Saved ${days} days ago`
  return d.format('MMM D') + ' saved'
}
