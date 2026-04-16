import 'server-only'

import type { Todo } from './todos.schema'

export type TodoListItem = {
  id: string
  originalText: string
  title: string
  excerpt: string
  timeText: string | null
  dueAt: Date | null
  completed: boolean
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

type TodoListRow = Pick<
  Todo,
  'id' | 'originalText' | 'timeText' | 'dueAt' | 'completedAt' | 'createdAt' | 'updatedAt'
>

export function toTodoListItem(todo: TodoListRow): TodoListItem {
  return {
    id: todo.id,
    originalText: todo.originalText,
    title: todo.originalText.slice(0, 32),
    excerpt: todo.originalText,
    timeText: todo.timeText,
    dueAt: todo.dueAt,
    completed: todo.completedAt !== null,
    completedAt: todo.completedAt,
    createdAt: todo.createdAt,
    updatedAt: todo.updatedAt,
  }
}
