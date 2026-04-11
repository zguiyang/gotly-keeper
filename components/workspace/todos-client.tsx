'use client'

import { useState } from 'react'
import { Check, Circle, Clock, MoreHorizontal, Plus } from 'lucide-react'

type Priority = 'urgent-important' | 'important' | 'urgent' | 'neither'

type TodoItem = {
  id: string
  title: string
  priority: Priority
  completed: boolean
  dueTime: string
  source: string
}

const mockTodos: TodoItem[] = [
  {
    id: '1',
    title: '明天下午整理报价',
    priority: 'urgent-important',
    completed: false,
    dueTime: '今天 14:00',
    source: '微信对话',
  },
  {
    id: '2',
    title: '回复李总关于 Q4 规划的邮件',
    priority: 'urgent-important',
    completed: false,
    dueTime: '今天 18:00',
    source: '网页书签',
  },
  {
    id: '3',
    title: '预订周五晚上的餐厅',
    priority: 'important',
    completed: false,
    dueTime: '周四 10:00',
    source: '语音笔记',
  },
  {
    id: '4',
    title: '查看 Gotly 降价通知',
    priority: 'urgent',
    completed: false,
    dueTime: '无截止日期',
    source: 'AI 发现',
  },
  {
    id: '5',
    title: '整理产品路线图文档',
    priority: 'important',
    completed: true,
    dueTime: '周五 17:00',
    source: 'AI 发现',
  },
  {
    id: '6',
    title: '阅读 AI 行业周报',
    priority: 'neither',
    completed: false,
    dueTime: '本周内',
    source: '邮件订阅',
  },
]

type QuadrantConfig = {
  key: Priority
  title: string
  subtitle: string
  dotColor: string
  labelBg: string
  labelText: string
}

const quadrantConfigs: QuadrantConfig[] = [
  {
    key: 'urgent-important',
    title: '紧急且重要',
    subtitle: '立即处理',
    dotColor: 'bg-red-500',
    labelBg: 'bg-red-50',
    labelText: 'text-red-600',
  },
  {
    key: 'important',
    title: '重要不紧急',
    subtitle: '计划处理',
    dotColor: 'bg-yellow-500',
    labelBg: 'bg-yellow-50',
    labelText: 'text-yellow-700',
  },
  {
    key: 'urgent',
    title: '紧急不重要',
    subtitle: '尽快处理',
    dotColor: 'bg-blue-500',
    labelBg: 'bg-blue-50',
    labelText: 'text-blue-600',
  },
  {
    key: 'neither',
    title: '都不重要',
    subtitle: '可延后处理',
    dotColor: 'bg-gray-400',
    labelBg: 'bg-gray-100',
    labelText: 'text-gray-500',
  },
]

function TodoItemComponent({
  item,
  onToggle,
}: {
  item: TodoItem
  onToggle: (id: string) => void
}) {
  return (
    <div
      className={`group flex items-start justify-between py-4 px-4 transition-all rounded-xl cursor-pointer ${
        item.completed
          ? 'opacity-50'
          : 'hover:bg-surface-container-low/50'
      }`}
      onClick={() => onToggle(item.id)}
    >
      <div className="flex items-start gap-4 flex-1">
        <button className="mt-0.5 shrink-0">
          {item.completed ? (
            <Check className="w-5 h-5 text-primary" />
          ) : (
            <Circle className="w-5 h-5 text-on-surface-variant/40" />
          )}
        </button>
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <h4
            className={`text-base font-medium leading-snug ${
              item.completed ? 'line-through text-on-surface-variant' : 'text-on-surface'
            }`}
          >
            {item.title}
          </h4>
          <div className="flex items-center gap-3 text-xs text-on-surface-variant/60">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {item.dueTime}
            </span>
            <span className="w-1 h-1 rounded-full bg-outline-variant" />
            <span>{item.source}</span>
          </div>
        </div>
      </div>
      <button className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface-container-high rounded-lg">
        <MoreHorizontal className="w-4 h-4 text-on-surface-variant" />
      </button>
    </div>
  )
}

function QuadrantCard({
  config,
  todos,
  onToggle,
}: {
  config: QuadrantConfig
  todos: TodoItem[]
  onToggle: (id: string) => void
}) {
  const activeTodos = todos.filter((t) => !t.completed)

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full ${config.dotColor}`} />
          <h3 className="text-sm font-bold text-on-surface">{config.title}</h3>
          <span className="text-xs text-on-surface-variant/50">·</span>
          <span className="text-xs text-on-surface-variant">{config.subtitle}</span>
        </div>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.labelBg} ${config.labelText}`}
        >
          {activeTodos.length} 项
        </span>
      </div>

      <div className="space-y-0">
        {activeTodos.length > 0 ? (
          activeTodos.map((item, index) => (
            <div key={item.id}>
              <TodoItemComponent item={item} onToggle={onToggle} />
              {index < activeTodos.length - 1 && (
                <div className="h-px bg-outline-variant/10 mx-4" />
              )}
            </div>
          ))
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm text-on-surface-variant/50">暂无待办</p>
          </div>
        )}
      </div>
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

  return (
    <>
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-bold tracking-widest text-primary uppercase opacity-60">
            Personal Inbox
          </span>
        </div>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tight font-[family-name:var(--font-manrope)]">
          待处理
        </h1>
        <p className="mt-3 text-on-surface-variant text-base max-w-2xl leading-relaxed">
          AI 自动捕获的灵感、任务与待办，正在等待你的确认或处理。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-5 max-w-5xl">
        {quadrantConfigs.map((config) => (
          <QuadrantCard
            key={config.key}
            config={config}
            todos={todos.filter((t) => t.priority === config.key)}
            onToggle={handleToggle}
          />
        ))}
      </div>

      <div className="fixed bottom-10 right-12">
        <button className="bg-gradient-to-br from-primary to-primary-container hover:opacity-90 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-primary/20 transition-all active:scale-95">
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </>
  )
}
