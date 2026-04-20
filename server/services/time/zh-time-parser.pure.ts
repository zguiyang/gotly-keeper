import 'server-only'

import { dayjs, ASIA_SHANGHAI_TIME_ZONE } from '@/shared/time/dayjs'

import type { AssetTimeParseResult, AssetTimeRangeHint } from '@/server/lib/config/time'

const WEEKDAY_INDEX: Record<string, number> = {
  周日: 0,
  周一: 1,
  周二: 2,
  周三: 3,
  周四: 4,
  周五: 5,
  周六: 6,
}

const CHINESE_DIGIT_MAP: Record<string, number> = {
  零: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
}

const CHINESE_UNIT_MAP: Record<string, number> = {
  十: 10,
  百: 100,
}

function startOfShanghaiDay(now: Date): Date {
  return dayjs(now).tz(ASIA_SHANGHAI_TIME_ZONE).startOf('day').toDate()
}

function addDays(date: Date, days: number): Date {
  return dayjs(date).add(days, 'day').toDate()
}

function addMonths(date: Date, months: number): Date {
  return dayjs(date).add(months, 'month').toDate()
}

function startOfShanghaiMonth(now: Date): Date {
  return dayjs(now).tz(ASIA_SHANGHAI_TIME_ZONE).startOf('month').toDate()
}

function endExclusive(date: Date): Date {
  return addDays(date, 1)
}

function applyTimeOfDay(date: Date, text: string): Date {
  const baseDate = dayjs(date).tz(ASIA_SHANGHAI_TIME_ZONE)
  if (text.includes('上午')) {
    return baseDate.hour(9).minute(0).second(0).toDate()
  }
  if (text.includes('下午')) {
    return baseDate.hour(14).minute(0).second(0).toDate()
  }
  if (text.includes('晚上')) {
    return baseDate.hour(19).minute(0).second(0).toDate()
  }
  return baseDate.hour(9).minute(0).second(0).toDate()
}

function extractTimeText(text: string): string | null {
  const dateMatch = text.match(
    /(今天|明天|后天|昨天|前天|大前天|这周|本周|上周|下周[一二三四五六日]?|周[一二三四五六日]|本月|这个月|上个月|最近|近期|前[一二两三四五六七八九十\d]+天|过去[一二两三四五六七八九十\d]+天|[一二两三四五六七八九十\d]+天前)/
  )
  const partOfDayMatch = text.match(/(上午|下午|晚上)/)
  if (!dateMatch && !partOfDayMatch) return null
  return [dateMatch?.[0], partOfDayMatch?.[0]]
    .filter(Boolean)
    .join('')
}

function parseChineseOrArabicInteger(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  if (/^\d+$/.test(trimmed)) {
    const value = Number.parseInt(trimmed, 10)
    return Number.isNaN(value) ? null : value
  }

  if (trimmed === '十') return 10

  let total = 0
  let section = 0
  let pendingDigit = 0

  for (const char of trimmed) {
    if (char in CHINESE_DIGIT_MAP) {
      pendingDigit = CHINESE_DIGIT_MAP[char]
      continue
    }

    if (char in CHINESE_UNIT_MAP) {
      const unit = CHINESE_UNIT_MAP[char]
      if (pendingDigit === 0) {
        pendingDigit = 1
      }
      section += pendingDigit * unit
      pendingDigit = 0
      continue
    }

    return null
  }

  total += section + pendingDigit
  return total > 0 ? total : null
}

function getNextWeekdayDate(now: Date, weekday: number): Date {
  const today = startOfShanghaiDay(now)
  const shanghaiToday = dayjs(today).tz(ASIA_SHANGHAI_TIME_ZONE)
  const currentWeekday = shanghaiToday.day()
  const delta = (weekday - currentWeekday + 7) % 7 || 7
  return addDays(today, delta)
}

function getNextWeekWeekdayDate(now: Date, weekday: number): Date {
  const today = startOfShanghaiDay(now)
  const shanghaiToday = dayjs(today).tz(ASIA_SHANGHAI_TIME_ZONE)
  const currentWeekday = shanghaiToday.day()
  const daysUntilNextWeekMonday = ((1 - currentWeekday + 7) % 7 || 7)
  const nextWeekMonday = addDays(today, daysUntilNextWeekMonday)
  const weekdayOffsetFromMonday = (weekday + 6) % 7
  return addDays(nextWeekMonday, weekdayOffsetFromMonday)
}

function getThisWeekRange(now: Date): AssetTimeRangeHint {
  const today = startOfShanghaiDay(now)
  const shanghaiToday = dayjs(today).tz(ASIA_SHANGHAI_TIME_ZONE)
  const currentWeekday = shanghaiToday.day()
  const daysFromMonday = (currentWeekday + 6) % 7
  const startsAt = addDays(today, -daysFromMonday)
  return {
    startsAt,
    endsAt: addDays(startsAt, 7),
  }
}

function getNextWeekRange(now: Date): AssetTimeRangeHint {
  const thisWeek = getThisWeekRange(now)
  const startsAt = thisWeek.endsAt
  return {
    startsAt,
    endsAt: addDays(startsAt, 7),
  }
}

function getLastWeekRange(now: Date): AssetTimeRangeHint {
  const thisWeek = getThisWeekRange(now)
  const startsAt = addDays(thisWeek.startsAt, -7)
  return {
    startsAt,
    endsAt: thisWeek.startsAt,
  }
}

function getThisMonthRange(now: Date): AssetTimeRangeHint {
  const startsAt = startOfShanghaiMonth(now)
  return {
    startsAt,
    endsAt: addMonths(startsAt, 1),
  }
}

function getLastMonthRange(now: Date): AssetTimeRangeHint {
  const thisMonth = getThisMonthRange(now)
  const startsAt = addMonths(thisMonth.startsAt, -1)
  return {
    startsAt,
    endsAt: thisMonth.startsAt,
  }
}

function getPastDaysRange(now: Date, days: number, includeToday: boolean): AssetTimeRangeHint {
  const today = startOfShanghaiDay(now)
  const safeDays = Math.max(days, 1)

  if (includeToday) {
    return {
      startsAt: addDays(today, -(safeDays - 1)),
      endsAt: endExclusive(today),
    }
  }

  return {
    startsAt: addDays(today, -safeDays),
    endsAt: today,
  }
}

export function parseZhTimeText(
  text: string,
  now = new Date()
): AssetTimeParseResult {
  if (!text) {
    return { timeText: null, dueAt: null, rangeHint: null }
  }
  const timeText = extractTimeText(text)
  if (!timeText) {
    return { timeText: null, dueAt: null, rangeHint: null }
  }

  const today = startOfShanghaiDay(now)

  if (timeText.includes('今天')) {
    const dueAt = applyTimeOfDay(today, timeText)
    return { timeText, dueAt, rangeHint: { startsAt: today, endsAt: endExclusive(today) } }
  }

  if (timeText.includes('明天')) {
    const day = addDays(today, 1)
    const dueAt = applyTimeOfDay(day, timeText)
    return { timeText, dueAt, rangeHint: { startsAt: day, endsAt: endExclusive(day) } }
  }

  if (timeText.includes('后天')) {
    const day = addDays(today, 2)
    const dueAt = applyTimeOfDay(day, timeText)
    return { timeText, dueAt, rangeHint: { startsAt: day, endsAt: endExclusive(day) } }
  }

  if (timeText.includes('昨天')) {
    const day = addDays(today, -1)
    const dueAt = applyTimeOfDay(day, timeText)
    return { timeText, dueAt, rangeHint: { startsAt: day, endsAt: endExclusive(day) } }
  }

  if (timeText.includes('大前天')) {
    const day = addDays(today, -3)
    const dueAt = applyTimeOfDay(day, timeText)
    return { timeText, dueAt, rangeHint: { startsAt: day, endsAt: endExclusive(day) } }
  }

  if (timeText.includes('前天')) {
    const day = addDays(today, -2)
    const dueAt = applyTimeOfDay(day, timeText)
    return { timeText, dueAt, rangeHint: { startsAt: day, endsAt: endExclusive(day) } }
  }

  const specificPastDayMatch = timeText.match(/([一二两三四五六七八九十\d]+)天前/)
  if (specificPastDayMatch?.[1]) {
    const dayCount = parseChineseOrArabicInteger(specificPastDayMatch[1])
    if (dayCount) {
      const day = addDays(today, -dayCount)
      const dueAt = applyTimeOfDay(day, timeText)
      return { timeText, dueAt, rangeHint: { startsAt: day, endsAt: endExclusive(day) } }
    }
  }

  const recentDaysMatch = timeText.match(/(?:前|过去)([一二两三四五六七八九十\d]+)天/)
  if (recentDaysMatch?.[1]) {
    const dayCount = parseChineseOrArabicInteger(recentDaysMatch[1])
    if (dayCount) {
      const includeToday = timeText.includes('过去')
      return { timeText, dueAt: null, rangeHint: getPastDaysRange(now, dayCount, includeToday) }
    }
  }

  if (timeText.includes('最近') || timeText.includes('近期')) {
    return { timeText, dueAt: null, rangeHint: getPastDaysRange(now, 7, true) }
  }

  const nextWeekdayMatch = timeText.match(/下周([一二三四五六日])/)
  if (nextWeekdayMatch) {
    const weekday = WEEKDAY_INDEX[`周${nextWeekdayMatch[1]}`]
    const day = getNextWeekWeekdayDate(now, weekday)
    const dueAt = applyTimeOfDay(day, timeText)
    return { timeText, dueAt, rangeHint: { startsAt: day, endsAt: endExclusive(day) } }
  }

  const weekdayMatch = timeText.match(/周([一二三四五六日])/)
  if (weekdayMatch) {
    const weekday = WEEKDAY_INDEX[`周${weekdayMatch[1]}`]
    const day = getNextWeekdayDate(now, weekday)
    const dueAt = applyTimeOfDay(day, timeText)
    return { timeText, dueAt, rangeHint: { startsAt: day, endsAt: endExclusive(day) } }
  }

  if (timeText.includes('本周') || timeText.includes('这周')) {
    return { timeText, dueAt: null, rangeHint: getThisWeekRange(now) }
  }

  if (timeText.includes('下周')) {
    return { timeText, dueAt: null, rangeHint: getNextWeekRange(now) }
  }

  if (timeText.includes('上周')) {
    return { timeText, dueAt: null, rangeHint: getLastWeekRange(now) }
  }

  if (timeText.includes('本月') || timeText.includes('这个月')) {
    return { timeText, dueAt: null, rangeHint: getThisMonthRange(now) }
  }

  if (timeText.includes('上个月')) {
    return { timeText, dueAt: null, rangeHint: getLastMonthRange(now) }
  }

  return { timeText, dueAt: null, rangeHint: null }
}
