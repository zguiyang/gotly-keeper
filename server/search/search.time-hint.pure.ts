import { ASIA_SHANGHAI_OFFSET_MS, type AssetTimeRangeHint, type AssetTimeParseResult } from '@/server/config/time'

const DAY_MS = 24 * 60 * 60 * 1000

const WEEKDAY_INDEX: Record<string, number> = {
  周日: 0,
  周一: 1,
  周二: 2,
  周三: 3,
  周四: 4,
  周五: 5,
  周六: 6,
}

function startOfShanghaiDay(now: Date) {
  const shanghaiNow = new Date(now.getTime() + ASIA_SHANGHAI_OFFSET_MS)
  const shanghaiMidnightUtc = Date.UTC(
    shanghaiNow.getUTCFullYear(),
    shanghaiNow.getUTCMonth(),
    shanghaiNow.getUTCDate()
  )
  return new Date(shanghaiMidnightUtc - ASIA_SHANGHAI_OFFSET_MS)
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS)
}

function endExclusive(date: Date) {
  return addDays(date, 1)
}

function applyTimeOfDay(date: Date, text: string) {
  if (text.includes('上午')) {
    return new Date(date.getTime() + 9 * 60 * 60 * 1000)
  }
  if (text.includes('下午')) {
    return new Date(date.getTime() + 14 * 60 * 60 * 1000)
  }
  if (text.includes('晚上')) {
    return new Date(date.getTime() + 19 * 60 * 60 * 1000)
  }
  return new Date(date.getTime() + 9 * 60 * 60 * 1000)
}

function extractTimeText(text: string) {
  const dateMatch = text.match(
    /(今天|明天|后天|这周|本周|下周[一二三四五六日]?|周[一二三四五六日])/
  )
  const partOfDayMatch = text.match(/(上午|下午|晚上)/)
  if (!dateMatch && !partOfDayMatch) return null
  return [dateMatch?.[0], partOfDayMatch?.[0]]
    .filter(Boolean)
    .join('')
}

function getNextWeekdayDate(now: Date, weekday: number) {
  const today = startOfShanghaiDay(now)
  const currentWeekday = new Date(today.getTime() + ASIA_SHANGHAI_OFFSET_MS).getUTCDay()
  const delta = (weekday - currentWeekday + 7) % 7 || 7
  return addDays(today, delta)
}

function getNextWeekWeekdayDate(now: Date, weekday: number) {
  const today = startOfShanghaiDay(now)
  const currentWeekday = new Date(today.getTime() + ASIA_SHANGHAI_OFFSET_MS).getUTCDay()
  const daysUntilNextWeekMonday = ((1 - currentWeekday + 7) % 7 || 7)
  const nextWeekMonday = addDays(today, daysUntilNextWeekMonday)
  const weekdayOffsetFromMonday = (weekday + 6) % 7
  return addDays(nextWeekMonday, weekdayOffsetFromMonday)
}

function getThisWeekRange(now: Date): AssetTimeRangeHint {
  const today = startOfShanghaiDay(now)
  const currentWeekday = new Date(today.getTime() + ASIA_SHANGHAI_OFFSET_MS).getUTCDay()
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

export function parseSearchTimeText(
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

export function parseSearchTimeHint(
  hint: string | null | undefined,
  now = new Date()
) {
  if (!hint) return null
  return parseSearchTimeText(hint, now).rangeHint
}
