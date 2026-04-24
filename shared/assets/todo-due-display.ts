import { ASIA_SHANGHAI_TIME_ZONE, dayjs } from '@/shared/time/dayjs'

export type TodoDueDisplayKind = 'scheduled' | 'uncertain' | 'unscheduled'

export type TodoDueDisplay = {
  kind: Exclude<TodoDueDisplayKind, 'uncertain'>
  label: string
}

type TodoDueInput = {
  dueAt: Date | string | number | null | undefined
  timeText: string | null | undefined
}

function parseDueAt(dueAt: TodoDueInput['dueAt']) {
  if (!dueAt) return null

  const parsed = dayjs(dueAt)
  return parsed.isValid() ? parsed.tz(ASIA_SHANGHAI_TIME_ZONE) : null
}

function formatDueLabel(dueAt: dayjs.Dayjs, now: Date) {
  const current = dayjs(now).tz(ASIA_SHANGHAI_TIME_ZONE)

  if (dueAt.isSame(current, 'day')) {
    return `今天 ${dueAt.format('HH:mm')}`
  }

  if (dueAt.isSame(current, 'year')) {
    return dueAt.format('M月D日 HH:mm')
  }

  return dueAt.format('YYYY年M月D日 HH:mm')
}

export function getTodoDueDisplay(input: TodoDueInput, now: Date = new Date()): TodoDueDisplay {
  const dueAt = parseDueAt(input.dueAt)

  if (dueAt) {
    return {
      kind: 'scheduled',
      label: formatDueLabel(dueAt, now),
    }
  }

  return {
    kind: 'unscheduled',
    label: '无截止日期',
  }
}
