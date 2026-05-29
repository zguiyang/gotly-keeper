import { dayjs, formatShortMonthDay } from '../time/dayjs'

import { type AssetListItem } from './assets.types'

export type AssetDateGroup = 'today' | 'yesterday' | 'older'

export function getAssetDateGroup(date: Date, now?: Date): AssetDateGroup {
  const value = new Date(date)
  const current = now ?? new Date()
  const today = new Date(current.getFullYear(), current.getMonth(), current.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const itemDay = new Date(value.getFullYear(), value.getMonth(), value.getDate())

  if (itemDay.getTime() === today.getTime()) return 'today'
  if (itemDay.getTime() === yesterday.getTime()) return 'yesterday'
  return 'older'
}

export function formatAssetRelativeTime(date: Date, locale?: string, now?: Date): string {
  const normalizedLocale = locale?.toLowerCase() ?? 'en'
  const d = dayjs(date)
  const base = now ? dayjs(now) : dayjs()
  if (Math.abs(base.diff(d, 'day')) > 7) {
    return formatShortMonthDay(d, normalizedLocale)
  }
  return d.locale(normalizedLocale).from(base)
}

export type TodoGroupKey = 'today' | 'thisWeek' | 'noDate' | 'completed'

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function isWithinRange(date: Date, startsAt: Date, endsAt: Date) {
  return date.getTime() >= startsAt.getTime() && date.getTime() < endsAt.getTime()
}

export function getTodoGroupKey(item: AssetListItem, now?: Date): TodoGroupKey {
  // completed is checked first - it takes highest priority regardless of date
  if (item.completed) return 'completed'

  const current = now ?? new Date()

  if (item.dueAt) {
    const dueAt = new Date(item.dueAt)
    if (!isNaN(dueAt.getTime())) {
      const today = startOfDay(current)
      const tomorrow = addDays(today, 1)
      const nextWeek = addDays(today, 7)

      if (isWithinRange(dueAt, today, addDays(tomorrow, 1))) return 'today'
      if (isWithinRange(dueAt, today, nextWeek)) return 'thisWeek'
    }
  }

  return 'noDate'
}
