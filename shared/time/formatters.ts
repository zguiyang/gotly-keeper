import { dayjs, ASIA_SHANGHAI_TIME_ZONE, formatShortDateTime, formatShortMonthDay } from './dayjs'

export function formatAbsoluteTime(
  date: Date | string | number,
  timezone: string = ASIA_SHANGHAI_TIME_ZONE,
  locale?: string
): string {
  return formatShortDateTime(dayjs(date).tz(timezone), locale)
}

export function formatAbsoluteDateTime(
  date: Date | string | number,
  timezone: string = ASIA_SHANGHAI_TIME_ZONE,
  locale?: string
): string {
  const d = locale ? dayjs(date).locale(locale) : dayjs(date)
  return d.tz(timezone).format('YYYY-MM-DD HH:mm')
}

export function formatBookmarkTime(
  date: Date | string | number,
  baseDate: Date | string | number = new Date(),
  locale?: string
): string {
  const isZh = locale === 'zh-cn'
  const d = locale ? dayjs(date).locale(locale) : dayjs(date)
  const base = dayjs(baseDate)
  const days = base.diff(d, 'day')

  if (days === 0) return isZh ? '今天保存' : 'Saved today'
  if (days === 1) return isZh ? '昨天保存' : 'Saved yesterday'
  if (days < 7) return isZh ? `${days}天前保存` : `Saved ${days} days ago`
  return formatShortMonthDay(d, locale) + (isZh ? '保存' : ' saved')
}
