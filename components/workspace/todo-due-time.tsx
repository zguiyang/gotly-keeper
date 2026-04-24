'use client'

import { CalendarClock, Clock } from 'lucide-react'

import { getTodoDueDisplay, type TodoDueInput } from '@/shared/assets/todo-due-display'

type TodoDueTimeProps = {
  item: TodoDueInput
  className?: string
}

const icons = {
  scheduled: CalendarClock,
  unscheduled: Clock,
} as const

export function TodoDueTime({ item, className }: TodoDueTimeProps) {
  const display = getTodoDueDisplay(item)
  const Icon = icons[display.kind]

  return (
    <span className={className ?? 'inline-flex max-w-full items-center gap-1.5 text-on-surface-variant/78'}>
      <Icon className="size-3.5 shrink-0 text-on-surface-variant/62" />
      <span className="truncate text-[12px] font-medium leading-4 tracking-normal">{display.label}</span>
    </span>
  )
}
