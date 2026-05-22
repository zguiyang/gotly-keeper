import dayjs from 'dayjs'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)
dayjs.extend(advancedFormat)

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

/**
 * Calendar / date-math helpers.
 * These replace common date-fns one-liners with dayjs equivalents,
 * so UI components don't need to import date-fns for rudimentary operations.
 */

/** Format a date with a dayjs format string (e.g. 'YYYY-MM-DD', 'LL'). */
export function formatDate(date: Date, formatStr: string): string {
  return dayjs(date).format(formatStr)
}

/** Check if two dates fall on the same calendar day. */
export function isSameDay(a: Date, b: Date): boolean {
  return dayjs(a).isSame(dayjs(b), 'day')
}

/** Check if a Date is valid (not `Invalid Date`). */
export function isValidDate(date: Date): boolean {
  return dayjs(date).isValid()
}

/** Return a new Date set to the start of the day (00:00:00). */
export function startOfDay(date: Date): Date {
  return dayjs(date).startOf('day').toDate()
}

/** Return a new Date set to the start of the month. */
export function startOfMonth(date: Date): Date {
  return dayjs(date).startOf('month').toDate()
}

/** Add N months to a date, returning a new Date. */
export function addMonths(date: Date, count: number): Date {
  return dayjs(date).add(count, 'month').toDate()
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
