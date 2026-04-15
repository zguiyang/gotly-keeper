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
  locale: string = 'zh-CN'
): string {
  const diffInSeconds = baseDate.diff(date, 'second')
  const isFuture = diffInSeconds < 0

  if (isFuture) {
    const absDiffInSeconds = Math.abs(diffInSeconds)
    if (absDiffInSeconds < 60) return '刚刚'
    const minutes = Math.floor(absDiffInSeconds / 60)
    if (minutes < 60) return `${minutes}分钟后`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}小时后`
    const days = Math.floor(hours / 24)
    if (days <= 7) return `${days}天后`
    return date.locale(locale).format('M月D日')
  }

  const days = baseDate.diff(date, 'day')
  if (days > 7) {
    return date.locale(locale).format('M月D日')
  }
  if (days > 1) return `${days}天前`
  if (days === 1) return '昨天'
  const hours = baseDate.diff(date, 'hour')
  if (hours > 1) return `${hours}小时前`
  if (hours === 1) return '1小时前'
  const minutes = baseDate.diff(date, 'minute')
  if (minutes > 1) return `${minutes}分钟前`
  return '刚刚'
}
