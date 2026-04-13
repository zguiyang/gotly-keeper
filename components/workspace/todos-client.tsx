'use client'

import { useState } from 'react'

import { Check, Circle, Clock, MoreHorizontal } from 'lucide-react'

import { setTodoCompletionAction } from '@/app/workspace/actions'
import { callAction } from '@/components/actions/call-action'
import { type AssetListItem } from '@/shared/assets/assets.types'

type GroupKey = 'today' | 'thisWeek' | 'noDate' | 'completed'

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

function getGroupKey(item: AssetListItem): GroupKey {
  if (item.completed) return 'completed'

  if (item.dueAt) {
    const dueAt = new Date(item.dueAt)
    const today = startOfDay(new Date())
    const tomorrow = addDays(today, 1)
    const dayAfterTomorrow = addDays(today, 2)
    const nextWeek = addDays(today, 7)

    if (isWithinRange(dueAt, today, dayAfterTomorrow)) return 'today'
    if (isWithinRange(dueAt, today, nextWeek)) return 'thisWeek'
  }

  if (item.timeText?.includes('今天') || item.timeText?.includes('明天')) return 'today'
  if (item.timeText?.includes('本周') || item.timeText?.includes('这周') || item.timeText?.includes('周')) return 'thisWeek'
  return 'noDate'
}

const groupLabels: Record<GroupKey, string> = {
  today: '今天',
  thisWeek: '本周',
  noDate: '无截止日期',
  completed: '已完成',
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
        {label}
      </span>
      <span className="text-xs text-on-surface-variant/50">·</span>
      <span className="text-xs text-on-surface-variant/60">{count} 项</span>
    </div>
  )
}

function TodoItemComponent({
  item,
  pending,
  onToggle,
}: {
  item: AssetListItem
  pending: boolean
  onToggle: (item: AssetListItem) => void
}) {
  return (
    <div
      className={`group flex items-start justify-between py-3.5 px-4 -mx-4 transition-all rounded-sm cursor-default ${
        item.completed ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <button
          type="button"
          onClick={() => onToggle(item)}
          disabled={pending}
          className="mt-0.5 shrink-0 rounded-sm text-left transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={item.completed ? '标记为未完成' : '标记为已完成'}
          title={item.completed ? '标记为未完成' : '标记为已完成'}
        >
          {item.completed ? (
            <Check className="w-5 h-5 text-primary" />
          ) : (
            <Circle className="w-5 h-5 text-on-surface-variant/30 hover:text-primary" />
          )}
        </button>
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <h4
            className={`text-sm font-medium leading-snug truncate ${
              item.completed ? 'line-through text-on-surface-variant' : 'text-on-surface'
            }`}
          >
            {item.title}
          </h4>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant/60">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {item.timeText || '无截止日期'}
            </span>
            <span className="w-1 h-1 rounded-full bg-outline-variant/40" />
            <span>来自统一入口</span>
          </div>
        </div>
      </div>
      <button
        type="button"
        className="p-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity hover:bg-surface-container-high rounded-sm cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        aria-label="更多操作"
      >
        <MoreHorizontal className="w-4 h-4 text-on-surface-variant" />
      </button>
    </div>
  )
}

function TodoSection({
  items,
  emptyMessage,
  pendingIds,
  onToggleTodo,
}: {
  items: AssetListItem[]
  emptyMessage: string
  pendingIds: Set<string>
  onToggleTodo: (item: AssetListItem) => void
}) {
  if (items.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-on-surface-variant/50">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {items.map((item, index) => (
        <div key={item.id}>
          <TodoItemComponent item={item} pending={pendingIds.has(item.id)} onToggle={onToggleTodo} />
          {index < items.length - 1 && (
            <div className="h-px bg-outline-variant/10 mx-4" />
          )}
        </div>
      ))}
    </div>
  )
}

export function TodosClient({ todos }: { todos: AssetListItem[] }) {
  const [items, setItems] = useState(todos)
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set())

  const grouped = {
    today: items.filter((t) => getGroupKey(t) === 'today'),
    thisWeek: items.filter((t) => getGroupKey(t) === 'thisWeek'),
    noDate: items.filter((t) => getGroupKey(t) === 'noDate'),
    completed: items.filter((t) => getGroupKey(t) === 'completed'),
  }

  const showEmptyState = items.length === 0

  function replaceItem(updated: AssetListItem) {
    setItems((current) =>
      current.map((item) => (item.id === updated.id ? updated : item))
    )
  }

  async function handleToggleTodo(item: AssetListItem) {
    if (pendingIds.has(item.id)) return

    const optimisticItem = { ...item, completed: !item.completed }

    setPendingIds((current) => new Set(current).add(item.id))
    replaceItem(optimisticItem)

    try {
      const updated = await callAction(
        () =>
          setTodoCompletionAction({
            assetId: item.id,
            completed: !item.completed,
          }),
        {
          loading: item.completed ? '正在恢复待办...' : '正在完成待办...',
          success: item.completed ? '已恢复待办。' : '已完成待办。',
          error: '待办状态更新失败，请重试。',
        }
      )

      replaceItem(updated)
    } catch {
      replaceItem(item)
    } finally {
      setPendingIds((current) => {
        const next = new Set(current)
        next.delete(item.id)
        return next
      })
    }
  }

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-bold tracking-widest text-primary uppercase opacity-60">
            Personal Inbox
          </span>
        </div>
        <h1 className="text-2xl lg:text-3xl font-bold text-on-surface tracking-tight font-[family-name:var(--font-manrope)]">
          待办
        </h1>
        <p className="mt-2 text-on-surface-variant text-sm max-w-2xl leading-relaxed">
          从统一入口保存的待处理事项，会按时间线索整理在这里。
        </p>
      </div>

      {showEmptyState ? (
        <div className="py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm font-medium text-on-surface-variant">
            暂无待办
          </p>
          <p className="text-xs text-on-surface-variant/60 mt-1">
            从统一入口保存新的待办后会出现在这里
          </p>
        </div>
      ) : (
        <div className="space-y-8 max-w-2xl">
          {grouped.today.length > 0 && (
            <div>
              <SectionHeader label={groupLabels.today} count={grouped.today.length} />
              <div className="bg-surface-container-lowest rounded-lg">
                <TodoSection items={grouped.today} emptyMessage="今天没有待办" pendingIds={pendingIds} onToggleTodo={handleToggleTodo} />
              </div>
            </div>
          )}

          {grouped.thisWeek.length > 0 && (
            <div>
              <SectionHeader label={groupLabels.thisWeek} count={grouped.thisWeek.length} />
              <div className="bg-surface-container-lowest rounded-lg">
                <TodoSection items={grouped.thisWeek} emptyMessage="本周没有待办" pendingIds={pendingIds} onToggleTodo={handleToggleTodo} />
              </div>
            </div>
          )}

          {grouped.noDate.length > 0 && (
            <div>
              <SectionHeader label={groupLabels.noDate} count={grouped.noDate.length} />
              <div className="bg-surface-container-lowest rounded-lg">
                <TodoSection items={grouped.noDate} emptyMessage="没有无截止日期的待办" pendingIds={pendingIds} onToggleTodo={handleToggleTodo} />
              </div>
            </div>
          )}

          {grouped.completed.length > 0 && (
            <div>
              <SectionHeader label={groupLabels.completed} count={grouped.completed.length} />
              <div className="bg-surface-container-lowest rounded-lg">
                <TodoSection items={grouped.completed} emptyMessage="没有已完成的待办" pendingIds={pendingIds} onToggleTodo={handleToggleTodo} />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
