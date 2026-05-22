import { ASIA_SHANGHAI_TIME_ZONE, dayjs } from '@/shared/time/dayjs'

export type TodoDueDisplayKind = 'scheduled' | 'time_recorded' | 'unscheduled'

export type TodoDueDisplay = {
  kind: TodoDueDisplayKind
  label: string
}

export type TodoDueInput = {
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
    return `today ${dueAt.format('HH:mm')}`
  }

  if (dueAt.isSame(current, 'year')) {
    return dueAt.format('MMM D HH:mm')
  }

  return dueAt.format('YYYY MMM D HH:mm')
}

export function getTodoDueDisplay(input: TodoDueInput, now: Date = new Date()): TodoDueDisplay {
  const dueAt = parseDueAt(input.dueAt)

  if (dueAt) {
    return {
      kind: 'scheduled',
      label: formatDueLabel(dueAt, now),
    }
  }

  if (input.timeText) {
    return {
      kind: 'time_recorded',
      label: `Scheduled: ${input.timeText}`,
    }
  }

  return {
    kind: 'unscheduled',
    label: 'No due date',
  }
}
