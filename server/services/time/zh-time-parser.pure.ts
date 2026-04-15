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

function startOfShanghaiDay(now: Date): Date {
  return dayjs(now).tz(ASIA_SHANGHAI_TIME_ZONE).startOf('day').toDate()
}

function addDays(date: Date, days: number): Date {
  return dayjs(date).add(days, 'day').toDate()
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
    /(今天|明天|后天|这周|本周|下周[一二三四五六日]?|周[一二三四五六日])/
  )
  const partOfDayMatch = text.match(/(上午|下午|晚上)/)
  if (!dateMatch && !partOfDayMatch) return null
  return [dateMatch?.[0], partOfDayMatch?.[0]]
    .filter(Boolean)
    .join('')
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

  return { timeText, dueAt: null, rangeHint: null }
}
