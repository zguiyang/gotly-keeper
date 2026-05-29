import { ASIA_SHANGHAI_TIME_ZONE, dayjs, formatShortDateTime } from '@/shared/time/dayjs'

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

function formatDueLabel(dueAt: dayjs.Dayjs, now: Date, locale?: string) {
  const isZh = locale === 'zh-cn'
  const current = dayjs(now).tz(ASIA_SHANGHAI_TIME_ZONE)

  if (dueAt.isSame(current, 'day')) {
    return isZh ? `今天 ${dueAt.format('HH:mm')}` : `today ${dueAt.format('HH:mm')}`
  }

  if (dueAt.isSame(current, 'year')) {
    return formatShortDateTime(dueAt, locale)
  }

  return dueAt.locale(locale ?? 'en').format(isZh ? 'YYYY年M月D日 HH:mm' : 'YYYY MMM D HH:mm')
}

export function getTodoDueDisplay(input: TodoDueInput, now: Date = new Date(), locale?: string): TodoDueDisplay {
  const isZh = locale === 'zh-cn'
  const dueAt = parseDueAt(input.dueAt)

  if (dueAt) {
    return {
      kind: 'scheduled',
      label: formatDueLabel(dueAt, now, locale),
    }
  }

  if (input.timeText) {
    return {
      kind: 'time_recorded',
      label: isZh ? `已安排: ${input.timeText}` : `Scheduled: ${input.timeText}`,
    }
  }

  return {
    kind: 'unscheduled',
    label: isZh ? '无到期日' : 'No due date',
  }
}
