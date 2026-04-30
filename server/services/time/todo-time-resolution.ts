import 'server-only'

import { ASIA_SHANGHAI_TIME_ZONE, dayjs } from '@/shared/time/dayjs'

export type ResolveTodoTimeTextInput = {
  timeText: string
  referenceTime: string
  timezone?: string
}

export type ResolvedTodoTimeText = {
  timeText: string
  dueAt: string | null
}

const DIGIT_MAP: Record<string, number> = {
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

const WEEKDAY_MAP: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  日: 7,
  天: 7,
}

const VAGUE_TIME_REGEX =
  /^(尽快|有空的时候|有空时|后面|后面处理|回头|回头再说|改天|之后|晚点|稍后)(.*)?$/

function getTrimmedValue(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function parseChineseInteger(value: string) {
  if (/^\d+$/.test(value)) {
    return Number.parseInt(value, 10)
  }

  if (value === '十') {
    return 10
  }

  const tenIndex = value.indexOf('十')
  if (tenIndex >= 0) {
    const tensPart = value.slice(0, tenIndex)
    const onesPart = value.slice(tenIndex + 1)
    const tens = tensPart ? (DIGIT_MAP[tensPart] ?? 0) : 1
    const ones = onesPart ? (DIGIT_MAP[onesPart] ?? 0) : 0
    const parsed = tens * 10 + ones
    return parsed > 0 ? parsed : null
  }

  return DIGIT_MAP[value] ?? null
}

function atEndOfDay(value: dayjs.Dayjs) {
  return value.hour(23).minute(59).second(59).millisecond(0)
}

function applyDefaultTime(value: dayjs.Dayjs, label: string) {
  switch (label) {
    case '明早':
    case '早上':
    case '上午':
      return value.hour(9).minute(0).second(0).millisecond(0)
    case '中午':
    case '午饭前':
      return value.hour(12).minute(0).second(0).millisecond(0)
    case '下午':
      return value.hour(15).minute(0).second(0).millisecond(0)
    case '傍晚':
    case '下班前':
      return value.hour(18).minute(0).second(0).millisecond(0)
    case '晚上':
    case '今晚':
      return value.hour(20).minute(0).second(0).millisecond(0)
    case '凌晨':
      return value.hour(1).minute(0).second(0).millisecond(0)
    default:
      return value
  }
}

function parseClockTime(
  hourText: string | undefined,
  minuteText: string | undefined,
  halfToken: string | undefined,
  daypart: string | undefined
) {
  if (!hourText) {
    return null
  }

  const parsedHour = parseChineseInteger(hourText)
  if (parsedHour === null) {
    return null
  }

  let hour = parsedHour
  let minute = 0

  if (halfToken === '半') {
    minute = 30
  } else if (minuteText) {
    const parsedMinute = parseChineseInteger(minuteText)
    if (parsedMinute === null) {
      return null
    }
    minute = parsedMinute
  }

  if (daypart === '下午' || daypart === '晚上' || daypart === '傍晚') {
    if (hour < 12) {
      hour += 12
    }
  } else if (daypart === '中午') {
    if (hour < 11) {
      hour += 12
    }
  } else if (daypart === '凌晨' && hour === 12) {
    hour = 0
  }

  return { hour, minute }
}

function parseColonClockTime(clockText: string | undefined, daypart: string | undefined) {
  if (!clockText) {
    return null
  }

  const match = clockText.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) {
    return null
  }

  return parseClockTime(match[1], match[2], undefined, daypart)
}

function resolveRelativeTime(text: string, reference: dayjs.Dayjs) {
  const match = text.match(/^([0-9一二三四五六七八九十两]+)(分钟|小时|天)后$/)
  if (!match) {
    return null
  }

  const amount = parseChineseInteger(match[1])
  if (!amount) {
    return null
  }

  if (match[2] === '分钟') {
    return reference.add(amount, 'minute')
  }

  if (match[2] === '小时') {
    return reference.add(amount, 'hour')
  }

  return reference.add(amount, 'day')
}

function resolveSpecialPhrase(text: string, reference: dayjs.Dayjs) {
  if (text === '今晚') {
    return applyDefaultTime(reference.clone(), '今晚')
  }

  if (text === '明早') {
    return applyDefaultTime(reference.add(1, 'day'), '明早')
  }

  if (text === '月底前') {
    return atEndOfDay(reference.endOf('month'))
  }

  if (text === '这周末' || text === '本周末' || text === '下周末') {
    const currentIsoWeekday = ((reference.day() + 6) % 7) + 1
    const daysUntilSunday = 7 - currentIsoWeekday
    const extraWeek = text === '下周末' ? 7 : 0
    return atEndOfDay(reference.add(daysUntilSunday + extraWeek, 'day'))
  }

  return null
}

function resolveRelativeDay(text: string, reference: dayjs.Dayjs) {
  const match = text.match(
    /^(今天|明天|后天)(上午|中午|下午|晚上|凌晨|早上)?(?:(\d{1,2}|[一二三四五六七八九十两]+)[点时](?:(半)|([0-9一二三四五六七八九十两]+)分?)?)?$/
  )
  if (!match) {
    return null
  }

  const [, dayLabel, daypart, hourText, halfToken, minuteText] = match
  const dayOffset = dayLabel === '今天' ? 0 : dayLabel === '明天' ? 1 : 2
  const resolved = reference.add(dayOffset, 'day')

  const clock = parseClockTime(hourText, minuteText, halfToken, daypart)
  if (clock) {
    return resolved
      .hour(clock.hour)
      .minute(clock.minute)
      .second(0)
      .millisecond(0)
  }

  if (daypart) {
    return applyDefaultTime(resolved, daypart)
  }

  return atEndOfDay(resolved)
}

function startOfCurrentWeek(reference: dayjs.Dayjs) {
  const currentIsoWeekday = ((reference.day() + 6) % 7) + 1
  return reference.subtract(currentIsoWeekday - 1, 'day')
}

function resolveWeekday(text: string, reference: dayjs.Dayjs) {
  const match = text.match(
    /^(本周|这周|下周|周)?([一二三四五六日天])(?:(下班前|午饭前|上午|中午|下午|晚上|凌晨|早上))?(?:(\d{1,2}|[一二三四五六七八九十两]+)[点时](?:(半)|([0-9一二三四五六七八九十两]+)分?)?)?$/
  )
  if (!match) {
    return null
  }

  const [, prefix = '周', weekdayLabel, daypart, hourText, halfToken, minuteText] = match
  const targetIsoWeekday = WEEKDAY_MAP[weekdayLabel]
  if (!targetIsoWeekday) {
    return null
  }

  const weekStart = startOfCurrentWeek(reference)
  const currentIsoWeekday = ((reference.day() + 6) % 7) + 1
  let base = weekStart

  if (prefix === '下周') {
    base = base.add(7, 'day')
  } else if (prefix === '周' && targetIsoWeekday < currentIsoWeekday) {
    base = base.add(7, 'day')
  }

  const resolved = base.add(targetIsoWeekday - 1, 'day')
  const clock = parseClockTime(hourText, minuteText, halfToken, daypart)

  if (clock) {
    return resolved
      .hour(clock.hour)
      .minute(clock.minute)
      .second(0)
      .millisecond(0)
  }

  if (daypart) {
    return applyDefaultTime(resolved, daypart)
  }

  return atEndOfDay(resolved)
}

function resolveNextMonthDate(text: string, reference: dayjs.Dayjs) {
  const match = text.match(/^下个月([0-9一二三四五六七八九十两]+)[日号]$/)
  if (!match) {
    return null
  }

  const dayOfMonth = parseChineseInteger(match[1])
  if (!dayOfMonth) {
    return null
  }

  const nextMonth = reference.add(1, 'month').date(1)
  if (dayOfMonth > nextMonth.daysInMonth()) {
    return null
  }

  return atEndOfDay(nextMonth.date(dayOfMonth))
}

function resolveFestival(text: string, reference: dayjs.Dayjs) {
  if (text !== '劳动节当天') {
    return null
  }

  const thisYear = atEndOfDay(reference.year(reference.year()).month(4).date(1))
  if (reference.isAfter(thisYear)) {
    return atEndOfDay(reference.year(reference.year() + 1).month(4).date(1))
  }

  return thisYear
}

function inferYear(month: number, day: number, reference: dayjs.Dayjs) {
  const thisYearCandidate = reference.year(reference.year()).month(month - 1).date(day)
  if (thisYearCandidate.isBefore(reference.startOf('day'))) {
    return reference.year() + 1
  }

  return reference.year()
}

function resolveCalendarDate(text: string, reference: dayjs.Dayjs) {
  const match = text.match(
    /^(?:(\d{4})年)?([0-9一二三四五六七八九十两]+)月([0-9一二三四五六七八九十两]+)[日号]?(上午|中午|下午|晚上|凌晨|早上|傍晚)?(?:(\d{1,2}|[一二三四五六七八九十两]+)[点时](?:(半)|([0-9一二三四五六七八九十两]+)分?)?|(\d{1,2}:\d{2}))?$/
  )
  if (!match) {
    return null
  }

  const [, yearText, monthText, dayText, daypart, hourText, halfToken, minuteText, colonClockText] = match
  const month = parseChineseInteger(monthText)
  const dayOfMonth = parseChineseInteger(dayText)
  if (!month || !dayOfMonth) {
    return null
  }

  const year = yearText ? Number.parseInt(yearText, 10) : inferYear(month, dayOfMonth, reference)
  const resolved = reference.year(year).month(month - 1).date(dayOfMonth)

  if (!resolved.isValid() || resolved.month() !== month - 1 || resolved.date() !== dayOfMonth) {
    return null
  }

  const clock =
    parseClockTime(hourText, minuteText, halfToken, daypart) ??
    parseColonClockTime(colonClockText, daypart)
  if (clock) {
    return resolved
      .hour(clock.hour)
      .minute(clock.minute)
      .second(0)
      .millisecond(0)
  }

  if (daypart) {
    return applyDefaultTime(resolved, daypart)
  }

  return atEndOfDay(resolved)
}

export function resolveTodoTimeText(input: ResolveTodoTimeTextInput): ResolvedTodoTimeText {
  const timeText = getTrimmedValue(input.timeText) ?? ''
  const timezone = input.timezone ?? ASIA_SHANGHAI_TIME_ZONE
  const reference = dayjs(input.referenceTime).tz(timezone)

  if (!timeText || !reference.isValid()) {
    return {
      timeText,
      dueAt: null,
    }
  }

  if (VAGUE_TIME_REGEX.test(timeText)) {
    return {
      timeText,
      dueAt: null,
    }
  }

  const resolved =
    resolveRelativeTime(timeText, reference) ??
    resolveSpecialPhrase(timeText, reference) ??
    resolveRelativeDay(timeText, reference) ??
    resolveWeekday(timeText, reference) ??
    resolveNextMonthDate(timeText, reference) ??
    resolveFestival(timeText, reference) ??
    resolveCalendarDate(timeText, reference)

  return {
    timeText,
    dueAt: resolved ? resolved.toISOString() : null,
  }
}
