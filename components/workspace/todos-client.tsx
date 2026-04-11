'use client'

import { useState } from 'react'
import { Check, Circle, Clock, MoreHorizontal } from 'lucide-react'

type TodoItem = {
  id: string
  title: string
  completed: boolean
  dueTime: string
  source: string
}

const mockTodos: TodoItem[] = [
  {
    id: '1',
    title: '明天下午整理报价',
    completed: false,
    dueTime: '今天 14:00',
    source: '来自统一入口',
  },
  {
    id: '2',
    title: '回复李总关于 Q4 规划的邮件',
    completed: false,
    dueTime: '今天 18:00',
    source: '来自统一入口',
  },
  {
    id: '3',
    title: '预订周五晚上的餐厅',
    completed: false,
    dueTime: '本周内',
    source: '链接中识别',
  },
  {
    id: '4',
    title: '查看 Gotly 降价通知',
    completed: false,
    dueTime: '无截止日期',
    source: '链接中识别',
  },
  {
    id: '5',
    title: '整理产品路线图文档',
    completed: true,
    dueTime: '周五 17:00',
    source: '链接中识别',
  },
  {
    id: '6',
    title: '阅读 AI 行业周报',
    completed: false,
    dueTime: '无截止日期',
    source: '来自统一入口',
  },
]

type GroupKey = 'today' | 'thisWeek' | 'noDate' | 'completed'

function getGroupKey(dueTime: string, completed: boolean): GroupKey {
  if (completed) return 'completed'
  if (dueTime.includes('今天')) return 'today'
  if (dueTime.includes('本周') || dueTime.includes('周') || dueTime.includes('周五')) return 'thisWeek'
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
  onToggle,
}: {
  item: TodoItem
  onToggle: (id: string) => void
}) {
  return (
    <div
      className={`group flex items-start justify-between py-3.5 px-4 -mx-4 transition-all rounded-sm cursor-pointer hover:bg-surface-container-low/50 ${
        item.completed ? 'opacity-60' : ''
      }`}
      onClick={() => onToggle(item.id)}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <button
          className="mt-0.5 shrink-0 cursor-pointer"
          aria-label={item.completed ? '标记为未完成' : '标记为已完成'}
          onClick={(e) => {
            e.stopPropagation()
            onToggle(item.id)
          }}
        >
          {item.completed ? (
            <Check className="w-5 h-5 text-primary" />
          ) : (
            <Circle className="w-5 h-5 text-on-surface-variant/30" />
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
              {item.dueTime}
            </span>
            <span className="w-1 h-1 rounded-full bg-outline-variant/40" />
            <span>{item.source}</span>
          </div>
        </div>
      </div>
      <button
        className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface-container-high rounded-sm cursor-pointer"
        aria-label="更多操作"
        onClick={(e) => e.stopPropagation()}
      >
        <MoreHorizontal className="w-4 h-4 text-on-surface-variant" />
      </button>
    </div>
  )
}

function TodoSection({
  items,
  onToggle,
  emptyMessage,
}: {
  items: TodoItem[]
  onToggle: (id: string) => void
  emptyMessage: string
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
          <TodoItemComponent item={item} onToggle={onToggle} />
          {index < items.length - 1 && (
            <div className="h-px bg-outline-variant/10 mx-4" />
          )}
        </div>
      ))}
    </div>
  )
}

export function TodosClient() {
  const [todos, setTodos] = useState<TodoItem[]>(mockTodos)

  const handleToggle = (id: string) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    )
  }

  const grouped = {
    today: todos.filter((t) => getGroupKey(t.dueTime, t.completed) === 'today'),
    thisWeek: todos.filter((t) => getGroupKey(t.dueTime, t.completed) === 'thisWeek'),
    noDate: todos.filter((t) => getGroupKey(t.dueTime, t.completed) === 'noDate'),
    completed: todos.filter((t) => getGroupKey(t.dueTime, t.completed) === 'completed'),
  }

  const showEmptyState =
    todos.filter((t) => !t.completed).length === 0

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-bold tracking-widest text-primary uppercase opacity-60">
            Personal Inbox
          </span>
        </div>
        <h1 className="text-2xl lg:text-3xl font-bold text-on-surface tracking-tight font-[family-name:var(--font-manrope)]">
          待处理
        </h1>
        <p className="mt-2 text-on-surface-variant text-sm max-w-2xl leading-relaxed">
          AI 自动捕获的灵感与待办，正在等待你的确认或处理。
        </p>
      </div>

      {showEmptyState ? (
        <div className="py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm font-medium text-on-surface-variant">
            所有待办已处理完毕
          </p>
          <p className="text-xs text-on-surface-variant/60 mt-1">
            去「全部内容」查看更多记录
          </p>
        </div>
      ) : (
        <div className="space-y-8 max-w-2xl">
          {grouped.today.length > 0 && (
            <div>
              <SectionHeader label={groupLabels.today} count={grouped.today.length} />
              <div className="bg-surface-container-lowest rounded-lg">
                <TodoSection
                  items={grouped.today}
                  onToggle={handleToggle}
                  emptyMessage="今天没有待办"
                />
              </div>
            </div>
          )}

          {grouped.thisWeek.length > 0 && (
            <div>
              <SectionHeader label={groupLabels.thisWeek} count={grouped.thisWeek.length} />
              <div className="bg-surface-container-lowest rounded-lg">
                <TodoSection
                  items={grouped.thisWeek}
                  onToggle={handleToggle}
                  emptyMessage="本周没有待办"
                />
              </div>
            </div>
          )}

          {grouped.noDate.length > 0 && (
            <div>
              <SectionHeader label={groupLabels.noDate} count={grouped.noDate.length} />
              <div className="bg-surface-container-lowest rounded-lg">
                <TodoSection
                  items={grouped.noDate}
                  onToggle={handleToggle}
                  emptyMessage="没有无截止日期的待办"
                />
              </div>
            </div>
          )}

          {grouped.completed.length > 0 && (
            <div>
              <SectionHeader label={groupLabels.completed} count={grouped.completed.length} />
              <div className="bg-surface-container-lowest rounded-lg">
                <TodoSection
                  items={grouped.completed}
                  onToggle={handleToggle}
                  emptyMessage="没有已完成的待办"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}