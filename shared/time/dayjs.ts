import dayjs from 'dayjs'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import updateLocale from 'dayjs/plugin/updateLocale'
import utc from 'dayjs/plugin/utc'
import 'dayjs/locale/zh-cn'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)
dayjs.extend(advancedFormat)
dayjs.extend(updateLocale)

/**
 * Custom compact relative-time formats for both locales.
 * This lets us use `dayjs.fromNow()` everywhere instead of
 * hand-rolling locale branching in every formatter.
 */
dayjs.updateLocale('en', {
  relativeTime: {
    future: '%s',
    past: '%s',
    s: () => 'just now',
    m: (n: number, _ws: boolean, _key: string, isFuture: boolean) => isFuture ? 'in 1min' : '1min ago',
    mm: (n: number) => `${n}min ago`,
    h: (n: number, _ws: boolean, _key: string, isFuture: boolean) => isFuture ? 'in 1h' : '1h ago',
    hh: (n: number) => `${n}h ago`,
    d: () => 'yesterday',
    dd: (n: number, _ws: boolean, _key: string, isFuture: boolean) => isFuture ? `in ${n}d` : `${n}d ago`,
  },
})

dayjs.updateLocale('zh-cn', {
  relativeTime: {
    future: '%s',
    past: '%s',
    s: () => '刚刚',
    m: (n: number, _ws: boolean, _key: string, isFuture: boolean) => isFuture ? '1分钟后' : '1分钟前',
    mm: (n: number, _ws: boolean, _key: string, isFuture: boolean) => isFuture ? `${n}分钟后` : `${n}分钟前`,
    h: (n: number, _ws: boolean, _key: string, isFuture: boolean) => isFuture ? '1小时后' : '1小时前',
    hh: (n: number, _ws: boolean, _key: string, isFuture: boolean) => isFuture ? `${n}小时后` : `${n}小时前`,
    d: () => '昨天',
    dd: (n: number, _ws: boolean, _key: string, isFuture: boolean) => isFuture ? `${n}天后` : `${n}天前`,
  },
})

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
export function formatDate(date: Date, formatStr: string, locale?: string): string {
  const d = locale ? dayjs(date).locale(locale) : dayjs(date)
  return d.format(formatStr)
}

/**
 * Compact month-day format locale-aware:  "Mar 15" / "6月15日".
 * Use this instead of raw `format('MMM D')` when the output is
 * user-facing and should read naturally in Chinese.
 */
export function formatShortMonthDay(date: dayjs.Dayjs | Date, locale?: string): string {
  const lc = locale?.toLowerCase()
  const d = lc ? dayjs(date).locale(lc) : dayjs(date)
  return d.format(lc === 'zh-cn' ? 'M月D日' : 'MMM D')
}

/** Same as formatShortMonthDay but with time: "Mar 15 09:00" / "6月15日 09:00". */
export function formatShortDateTime(date: dayjs.Dayjs | Date, locale?: string): string {
  const lc = locale?.toLowerCase()
  const d = lc ? dayjs(date).locale(lc) : dayjs(date)
  return d.format(lc === 'zh-cn' ? 'M月D日 HH:mm' : 'MMM D HH:mm')
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

/**
 * Relative time with a 7-day cap — beyond that falls back to absolute
 * date (e.g. "Mar 15" / "6月 15"). Actual label wording is driven by the
 * custom compact locales defined above, so this function needs zero
 * locale branching.
 */
export function toRelative(
  date: dayjs.Dayjs,
  baseDate: dayjs.Dayjs,
  locale: string = 'en'
): string {
  const normalizedLocale = locale.toLowerCase()
  if (Math.abs(baseDate.diff(date, 'day')) > 7) {
    return formatShortMonthDay(date, normalizedLocale)
  }
  return date.locale(normalizedLocale).from(baseDate)
}
