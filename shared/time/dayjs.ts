import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)

export const ASIA_SHANGHAI_TIME_ZONE = 'Asia/Shanghai'

export { dayjs }

export function toIso(date: Date | string | number = new Date()): string {
  return dayjs(date).toISOString()
}

export function nowIso(date?: Date | string | number): string {
  return toIso(date ?? new Date())
}

export function now(): Date {
  return dayjs().toDate()
}

export function formatShanghaiTime(date: Date | string | number = new Date()): string {
  return dayjs(date).tz(ASIA_SHANGHAI_TIME_ZONE).format('YYYY-MM-DD HH:mm:ss')
}

export function toRelative(
  date: dayjs.Dayjs,
  baseDate: dayjs.Dayjs,
  locale: string = 'en'
): string {
  const diffInSeconds = baseDate.diff(date, 'second')
  const isFuture = diffInSeconds < 0

  if (isFuture) {
    const absDiffInSeconds = Math.abs(diffInSeconds)
    if (absDiffInSeconds < 60) return 'just now'
    const minutes = Math.floor(absDiffInSeconds / 60)
    if (minutes < 60) return `in ${minutes}min`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `in ${hours}h`
    const days = Math.floor(hours / 24)
    if (days <= 7) return `in ${days}d`
    return date.locale(locale).format('MMM D')
  }

  const days = baseDate.diff(date, 'day')
  if (days > 7) {
    return date.locale(locale).format('MMM D')
  }
  if (days > 1) return `${days}d ago`
  if (days === 1) return 'yesterday'
  const hours = baseDate.diff(date, 'hour')
  if (hours > 1) return `${hours}h ago`
  if (hours === 1) return '1h ago'
  const minutes = baseDate.diff(date, 'minute')
  if (minutes > 1) return `${minutes}min ago`
  return 'just now'
}
