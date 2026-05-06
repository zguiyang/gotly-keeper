import 'server-only'

import { dayjs, ASIA_SHANGHAI_TIME_ZONE } from '@/shared/time/dayjs'

import { toReference, toIsoWeekday } from './todo-time-tools'

// ---- Types ----

export type TimeGranularity = 'exact' | 'daypart' | 'date_only' | 'vague' | 'unresolved'

export interface ResolveDatetimeInput {
  phrase: string
  referenceTime: string
  timezone?: string
}

export interface ResolveDatetimeOutput {
  normalizedText: string
  dueAt: string | null
  granularity: TimeGranularity
}

// ---- Constants ----

const daypartToHour: Record<string, number> = {
  '上午': 9, '早上': 9, '明早': 9, '早晨': 9,
  '中午': 12, '午饭': 12,
  '下午': 15, '午后': 15,
  '傍晚': 18, '下班': 18,
  '晚上': 20, '今晚': 20,
  '凌晨': 1, '半夜': 1,
}

const DEFAULT_BUSINESS_HOUR = 18
const DEFAULT_BUSINESS_MINUTE = 0

const VAGUE_PHRASES = [
  '尽快', '有空的时候', '后面处理', '改天', '之后', '晚点', '稍后',
  'later', 'sometime', 'asap', 'whenever',
]

const HOLIDAY_PHRASES = [
  '春节', '中秋节', '中秋', '端午节', '端午', '清明节', '清明',
  '元宵节', '国庆', '五一', '元旦', '重阳节', '腊八',
  '圣诞', '感恩节', '情人节',
]

const CHINESE_NUM: Record<string, number> = {
  '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
}

const CHINESE_WEEKDAY: Record<string, number> = {
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 7, '天': 7,
}

// ---- Helpers ----

export function isVagueTimePhrase(phrase: string): boolean {
  return VAGUE_PHRASES.some((v) => phrase.includes(v))
}

export function isHolidayTimePhrase(phrase: string): boolean {
  return HOLIDAY_PHRASES.some((h) => phrase.includes(h))
}

function parseChineseNumber(text: string): number | null {
  if (CHINESE_NUM[text] !== undefined) return CHINESE_NUM[text]
  if (text.startsWith('十')) {
    if (text === '十') return 10
    const rest = text.slice(1)
    if (rest && CHINESE_NUM[rest] !== undefined) return 10 + CHINESE_NUM[rest]
  }
  if (text.startsWith('二十')) {
    const rest = text.slice(2)
    if (rest && CHINESE_NUM[rest] !== undefined) return 20 + CHINESE_NUM[rest]
    if (!rest) return 20
  }
  if (text.startsWith('三十')) {
    const rest = text.slice(2)
    if (rest && CHINESE_NUM[rest] !== undefined) return 30 + CHINESE_NUM[rest]
    if (!rest) return 30
  }
  return null
}

function applyDaypartToTime(daypartKeyword: string, hour: number, minute: number): { hour: number; minute: number } {
  if (['下午', '晚上', '傍晚', '下班', '今晚', '午后'].includes(daypartKeyword)) {
    if (hour >= 1 && hour <= 12) {
      return { hour: hour + 12, minute }
    }
  }
  if (['凌晨', '半夜'].includes(daypartKeyword)) {
    if (hour === 12) {
      return { hour: 0, minute }
    }
  }
  return { hour, minute }
}

// ---- Daypart detection ----

function findDaypart(phrase: string): { keyword: string; hour: number; minute: number } | null {
  const matched = Object.keys(daypartToHour).find((k) => phrase.includes(k))
  if (!matched) return null
  return { keyword: matched, hour: daypartToHour[matched], minute: 0 }
}

// ---- Explicit time parsing ----

function findExplicitTime(phrase: string): { hour: number; minute: number } | null {
  const patterns: Array<{
    regex: RegExp
    parse: (m: RegExpExecArray) => { hour: number; minute: number } | null
  }> = [
    // HH:MM
    {
      regex: /(\d{1,2}):(\d{2})\b/,
      parse: (m) => ({ hour: parseInt(m[1]), minute: parseInt(m[2]) }),
    },
    // X点Y分 (digits)
    {
      regex: /(\d{1,2})点(\d{1,2})分/,
      parse: (m) => ({ hour: parseInt(m[1]), minute: parseInt(m[2]) }),
    },
    // X点半 (digits)
    {
      regex: /(\d{1,2})点半/,
      parse: (m) => ({ hour: parseInt(m[1]), minute: 30 }),
    },
    // X点 (digits)
    {
      regex: /(\d{1,2})点(?!半|\d)/,
      parse: (m) => ({ hour: parseInt(m[1]), minute: 0 }),
    },
    // Chinese number X点Y分
    {
      regex: /([一二三四五六七八九十]+)点([一二三四五六七八九十]+)分/,
      parse: (m) => {
        const h = parseChineseNumber(m[1])
        const min = parseChineseNumber(m[2])
        if (h === null || min === null) return null
        return { hour: h, minute: min }
      },
    },
    // Chinese number X点半
    {
      regex: /([一二三四五六七八九十]+)点半/,
      parse: (m) => {
        const h = parseChineseNumber(m[1])
        if (h === null) return null
        return { hour: h, minute: 30 }
      },
    },
    // Chinese number X点
    {
      regex: /([一二三四五六七八九十]+)点(?!半|\d|[一二三四五六七八九十])/,
      parse: (m) => {
        const h = parseChineseNumber(m[1])
        if (h === null) return null
        return { hour: h, minute: 0 }
      },
    },
  ]

  for (const { regex, parse } of patterns) {
    const match = regex.exec(phrase)
    if (match) {
      const result = parse(match)
      if (result) return result
    }
  }

  return null
}

// ---- Date parsing (pure dayjs logic, mirroring low-level tools) ----

function tryRelativeDate(phrase: string, ref: dayjs.Dayjs): dayjs.Dayjs | null {
  if (phrase.includes('大后天')) return ref.add(3, 'day')
  if (phrase.includes('后天')) return ref.add(2, 'day')
  if (phrase.includes('明天') || phrase.includes('明早') || phrase.includes('明晚')) return ref.add(1, 'day')
  if (phrase.includes('今天') || phrase.includes('今早') || phrase.includes('今晚')) return ref

  const daysLater = phrase.match(/(\d+)天后/)
  if (daysLater) return ref.add(parseInt(daysLater[1]), 'day')

  const hoursLater = phrase.match(/(\d+)个?(?:小时|hour)后/)
  if (hoursLater) return ref.add(parseInt(hoursLater[1]), 'hour')

  const minutesLater = phrase.match(/(\d+)个?(?:分钟|minute|分)后/)
  if (minutesLater) return ref.add(parseInt(minutesLater[1]), 'minute')

  // Chinese numerals for relative offsets (e.g. 五分钟后, 三小时后)
  const chineseRelative = phrase.match(/([一二三四五六七八九十]+)个?(?:小时|hour|分钟|minute|分)后/)
  if (chineseRelative) {
    const num = parseChineseNumber(chineseRelative[1])
    if (num !== null) {
      const unit = /(?:小时|hour)/.test(chineseRelative[0]) ? 'hour' : 'minute'
      return ref.add(num, unit)
    }
  }

  return null
}

function tryWeekdayDate(phrase: string, ref: dayjs.Dayjs): dayjs.Dayjs | null {
  const weekdayPattern = /(?:(下(?:个)?|这(?:个)?|本|上(?:个)?)?)?(?:周|星期)([一二三四五六日天])/
  const match = weekdayPattern.exec(phrase)
  if (!match) return null

  const prefix = match[1]
  const weekdayChar = match[2]
  const targetWeekday = CHINESE_WEEKDAY[weekdayChar]
  if (!targetWeekday) return null

  const todayWeekday = toIsoWeekday(ref)
  let daysUntil = (targetWeekday - todayWeekday + 7) % 7

  if (prefix?.includes('下')) {
    // "下X" means "next week's weekday X".
    // If the next occurrence is already in next week (daysUntil > 7 - todayWeekday),
    // keep it; otherwise push by 7 to skip current week.
    if (daysUntil <= 7 - todayWeekday) {
      daysUntil += 7
    }
  } else if (prefix?.includes('上')) {
    daysUntil -= 7
  } else if (!prefix || prefix.includes('本') || prefix.includes('这')) {
    // no prefix / 本 / 这 → this week's occurrence, or next if already passed
  } else {
    if (daysUntil === 0) daysUntil = 7
  }

  return ref.add(daysUntil, 'day')
}

function trySpecificDate(phrase: string, ref: dayjs.Dayjs): dayjs.Dayjs | null {
  const match = phrase.match(/(\d{1,2})月(\d{1,2})[日号]/)
  if (!match) return null

  const month = parseInt(match[1])
  const day = parseInt(match[2])

  const thisYear = ref.year(ref.year()).month(month - 1).date(day)
  return thisYear.isBefore(ref.startOf('day'))
    ? ref.year(ref.year() + 1).month(month - 1).date(day)
    : thisYear
}

function tryPeriodEnd(phrase: string, ref: dayjs.Dayjs): dayjs.Dayjs | null {
  if (phrase.includes('下个月底') || phrase.includes('下下月底')) {
    return ref.add(phrase.includes('下下') ? 2 : 1, 'month').endOf('month')
  }
  if (phrase.includes('月底') || phrase.includes('月末')) {
    return ref.endOf('month')
  }
  if (phrase.includes('下周末')) {
    const todayWeekday = toIsoWeekday(ref)
    const daysUntilSunday = 7 - todayWeekday
    return ref.add(daysUntilSunday + 7, 'day')
  }
  if (phrase.includes('本周末') || (phrase.includes('周末') && !phrase.includes('下'))) {
    const todayWeekday = toIsoWeekday(ref)
    const daysUntilSunday = 7 - todayWeekday
    return ref.add(daysUntilSunday, 'day')
  }
  return null
}

function tryNextMonthDay(phrase: string, ref: dayjs.Dayjs): dayjs.Dayjs | null {
  const match = phrase.match(/(下(?:下)?个?月)(\d{1,2})[日号]/)
  if (!match) return null

  const offset = match[1].includes('下下') ? 2 : 1
  const day = parseInt(match[2])

  const targetMonth = ref.add(offset, 'month')
  return dayjs(targetMonth).date(day)
}

// ---- Granularity detection ----

function determineGranularity(phrase: string, hasExplicitTime: boolean, hasDaypart: boolean, hasDate: boolean): TimeGranularity {
  if (!hasDate) {
    if (isVagueTimePhrase(phrase)) return 'vague'
    return 'unresolved'
  }
  if (hasExplicitTime) return 'exact'
  if (hasDaypart) return 'daypart'
  return 'date_only'
}

// ---- Main resolver ----

export function resolveDatetime(input: ResolveDatetimeInput): ResolveDatetimeOutput {
  const { phrase, referenceTime, timezone = ASIA_SHANGHAI_TIME_ZONE } = input
  const normalized = phrase.trim()

  if (isHolidayTimePhrase(normalized)) {
    return { normalizedText: normalized, dueAt: null, granularity: 'unresolved' }
  }

  if (isVagueTimePhrase(normalized)) {
    return { normalizedText: normalized, dueAt: null, granularity: 'vague' }
  }

  const ref = toReference(referenceTime, timezone)

  // Phase 1: Detect daypart
  const daypart = findDaypart(normalized)
  const hasDaypart = daypart !== null

  // Phase 2: Detect explicit time
  const explicitTime = findExplicitTime(normalized)
  const hasExplicitTime = explicitTime !== null

  // Phase 3: Resolve final hour/minute
  let hour: number
  let minute: number

  if (hasExplicitTime) {
    hour = explicitTime!.hour
    minute = explicitTime!.minute
    if (hasDaypart) {
      const adjusted = applyDaypartToTime(daypart!.keyword, hour, minute)
      hour = adjusted.hour
      minute = adjusted.minute
    }
  } else if (hasDaypart) {
    hour = daypart!.hour
    minute = daypart!.minute
  } else {
    hour = DEFAULT_BUSINESS_HOUR
    minute = DEFAULT_BUSINESS_MINUTE
  }

  // Phase 4: Detect date
  let baseDate: dayjs.Dayjs | null = null

  baseDate = tryRelativeDate(normalized, ref)
  if (!baseDate) baseDate = tryWeekdayDate(normalized, ref)
  if (!baseDate) baseDate = trySpecificDate(normalized, ref)
  if (!baseDate) baseDate = tryPeriodEnd(normalized, ref)
  if (!baseDate) baseDate = tryNextMonthDay(normalized, ref)

  // Phase 5: Fallback — if a time component exists but no date, use reference date
  const hasTimeComponent = hasExplicitTime || hasDaypart
  if (!baseDate && hasTimeComponent) {
    baseDate = ref
  }

  if (!baseDate) {
    const granularity = determineGranularity(normalized, hasExplicitTime, hasDaypart, false)
    return { normalizedText: normalized, dueAt: null, granularity }
  }

  // For relative time offsets (X小时后, X分钟后), return the computed absolute time
  const isRelativeTime =
    /(\d+)个?(?:小时|hour|分钟|minute|分)后/.test(normalized) ||
    /[一二三四五六七八九十]+个?(?:小时|hour|分钟|minute|分)后/.test(normalized)

  if (isRelativeTime) {
    const dueAt = baseDate.toISOString()
    return {
      normalizedText: normalized,
      dueAt,
      granularity: 'exact',
    }
  }

  // Apply time to base date
  const dueAt = baseDate
    .hour(hour)
    .minute(minute)
    .second(0)
    .millisecond(0)
    .toISOString()

  const granularity = determineGranularity(normalized, hasExplicitTime, hasDaypart, true)

  return {
    normalizedText: normalized,
    dueAt,
    granularity,
  }
}
