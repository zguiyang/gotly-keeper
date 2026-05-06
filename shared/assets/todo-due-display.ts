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

  if (input.timeText) {
    return {
      kind: 'time_recorded',
      label: `已记录时间描述：${input.timeText}`,
    }
  }

  return {
    kind: 'unscheduled',
    label: '暂无截止日期',
  }
}
