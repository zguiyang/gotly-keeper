import 'server-only'

import { Culture, recognizeDateTime } from '@microsoft/recognizers-text-suite'

import { ASIA_SHANGHAI_TIME_ZONE, dayjs } from '@/shared/time/dayjs'

type TodoTimeSourceSlot =
  | 'due'
  | 'timeText'
  | 'time'
  | 'dueAt'
  | 'dueDate'
  | 'dueText'
  | 'dueTime'
  | 'rawText'

export type ParseTodoTimeInput = {
  rawText?: string | null
  slots?: Record<string, string | undefined>
}

export type ParsedTodoTime = {
  rawText: string
  timeText: string
  dueAt: string | null
  sourceSlot: TodoTimeSourceSlot
}

function getTrimmedValue(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function isIsoDateTime(value: string) {
  return value.includes('T') && !Number.isNaN(Date.parse(value))
}

function resolveSource(input: ParseTodoTimeInput): { text: string; sourceSlot: TodoTimeSourceSlot } | null {
  const slotDueAt = getTrimmedValue(input.slots?.dueAt)
  if (slotDueAt) {
    return { text: slotDueAt, sourceSlot: 'dueAt' }
  }

  const slotTimeText = getTrimmedValue(input.slots?.timeText)
  if (slotTimeText) {
    return { text: slotTimeText, sourceSlot: 'timeText' }
  }

  const slotDue = getTrimmedValue(input.slots?.due)
  if (slotDue) {
    return { text: slotDue, sourceSlot: 'due' }
  }

  const slotDueTime = getTrimmedValue(input.slots?.dueTime)
  if (slotDueTime) {
    return { text: slotDueTime, sourceSlot: 'dueTime' }
  }

  const slotDueText = getTrimmedValue(input.slots?.dueText)
  if (slotDueText) {
    return { text: slotDueText, sourceSlot: 'dueText' }
  }

  const slotDueDate = getTrimmedValue(input.slots?.dueDate)
  if (slotDueDate) {
    return { text: slotDueDate, sourceSlot: 'dueDate' }
  }

  const legacyTime = getTrimmedValue(input.slots?.time)
  if (legacyTime) {
    return { text: legacyTime, sourceSlot: 'time' }
  }

  const rawText = getTrimmedValue(input.rawText)
  if (rawText) {
    return { text: rawText, sourceSlot: 'rawText' }
  }

  return null
}

function toDueAtIso(value: string) {
  if (isIsoDateTime(value)) {
    return new Date(value).toISOString()
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return dayjs.tz(`${value} 23:59:59`, ASIA_SHANGHAI_TIME_ZONE).toISOString()
  }

  const normalized = dayjs.tz(value, ASIA_SHANGHAI_TIME_ZONE)
  if (!normalized.isValid()) {
    return null
  }

  return normalized.toISOString()
}

function parseChineseInteger(value: string) {
  if (/^\d+$/.test(value)) {
    return Number.parseInt(value, 10)
  }

  const digits: Record<string, number> = {
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

  if (value === '十') {
    return 10
  }

  const tenIndex = value.indexOf('十')
  if (tenIndex >= 0) {
    const tensPart = value.slice(0, tenIndex)
    const onesPart = value.slice(tenIndex + 1)
    const tens = tensPart ? (digits[tensPart] ?? 0) : 1
    const ones = onesPart ? (digits[onesPart] ?? 0) : 0
    const parsed = tens * 10 + ones
    return parsed > 0 ? parsed : null
  }

  return digits[value] ?? null
}

function resolveRelativeDueAt(text: string) {
  const match = text.match(/^([0-9一二三四五六七八九十两]+)(分钟|小时|天)后$/)
  if (!match) {
    return null
  }

  const [, amountText, unitText] = match
  const amount = parseChineseInteger(amountText)
  if (!amount) {
    return null
  }

  const current = dayjs().tz(ASIA_SHANGHAI_TIME_ZONE)
  if (unitText === '分钟') {
    return current.add(amount, 'minute').toISOString()
  }

  if (unitText === '小时') {
    return current.add(amount, 'hour').toISOString()
  }

  return current.add(amount, 'day').toISOString()
}

function resolveRelativeMonthDueAt(text: string) {
  const match = text.match(/^下个月([0-9一二三四五六七八九十两]+)[日号]$/)
  if (!match) {
    return null
  }

  const [, dayText] = match
  const dayOfMonth = parseChineseInteger(dayText)
  if (!dayOfMonth) {
    return null
  }

  const nextMonth = dayjs().tz(ASIA_SHANGHAI_TIME_ZONE).add(1, 'month')
  if (dayOfMonth > nextMonth.daysInMonth()) {
    return null
  }

  return nextMonth.date(dayOfMonth).hour(23).minute(59).second(59).millisecond(0).toISOString()
}

function resolveWeekendDueAt(text: string) {
  if (text !== '这周末' && text !== '本周末' && text !== '下周末') {
    return null
  }

  const current = dayjs().tz(ASIA_SHANGHAI_TIME_ZONE)
  const daysUntilSunday = (7 - current.day()) % 7
  const extraWeeks = text === '下周末' ? 1 : 0

  return current
    .add(daysUntilSunday + extraWeeks * 7, 'day')
    .hour(23)
    .minute(59)
    .second(59)
    .millisecond(0)
    .toISOString()
}

function resolveRecognizedDueAt(text: string) {
  const relativeDueAt = resolveRelativeDueAt(text)
  if (relativeDueAt) {
    return relativeDueAt
  }

  const relativeMonthDueAt = resolveRelativeMonthDueAt(text)
  if (relativeMonthDueAt) {
    return relativeMonthDueAt
  }

  const weekendDueAt = resolveWeekendDueAt(text)
  if (weekendDueAt) {
    return weekendDueAt
  }

  const results = recognizeDateTime(text, Culture.Chinese)

  for (const result of results) {
    const values = (result.resolution as { values?: Array<{ value?: string; type?: string }> } | undefined)
      ?.values

    if (!Array.isArray(values)) {
      continue
    }

    const resolved = values.find((value) => {
      return (
        typeof value.value === 'string' &&
        (value.type === 'datetime' || value.type === 'date')
      )
    })

    if (!resolved?.value) {
      continue
    }

    return toDueAtIso(resolved.value)
  }

  return null
}

export function parseTodoTime(input: ParseTodoTimeInput): ParsedTodoTime | null {
  const source = resolveSource(input)
  if (!source) {
    return null
  }

  const dueAt =
    source.sourceSlot === 'dueAt' ? toDueAtIso(source.text) : resolveRecognizedDueAt(source.text)

  return {
    rawText: source.text,
    timeText: source.sourceSlot === 'dueAt' ? getTrimmedValue(input.slots?.timeText) ?? source.text : source.text,
    dueAt,
    sourceSlot: source.sourceSlot,
  }
}
