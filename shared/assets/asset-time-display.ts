import { dayjs } from '../time/dayjs'

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
  const current = now ? dayjs(now) : dayjs()
  const d = dayjs(date)

  const days = current.diff(d, 'day')
  if (days > 7) {
    return d.locale(locale ?? 'zh-CN').format('M月D日')
  }
  if (days > 1) return `${days}天前`
  if (days === 1) return '昨天'
  const hours = current.diff(d, 'hour')
  if (hours > 1) return `${hours}小时前`
  if (hours === 1) return '1小时前'
  const minutes = current.diff(d, 'minute')
  if (minutes > 1) return `${minutes}分钟前`
  return '刚刚'
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

  if (item.timeText?.includes('今天') || item.timeText?.includes('明天')) return 'today'
  if (item.timeText?.includes('本周') || item.timeText?.includes('这周') || item.timeText?.includes('周')) return 'thisWeek'
  return 'noDate'
}
