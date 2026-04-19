import 'server-only'

import { ASSET_LIFECYCLE_STATUS } from '@/shared/assets/asset-lifecycle.types'

import type { Todo } from './todos.schema'
import type { TodoListItem } from './todos.types'

type TodoListRow = Partial<Pick<
  Todo,
  | 'id'
  | 'originalText'
  | 'title'
  | 'content'
  | 'timeText'
  | 'dueAt'
  | 'completedAt'
  | 'lifecycleStatus'
  | 'archivedAt'
  | 'trashedAt'
  | 'createdAt'
  | 'updatedAt'
>> & Pick<Todo, 'id' | 'originalText' | 'timeText' | 'dueAt' | 'completedAt' | 'createdAt' | 'updatedAt'>

export function toTodoListItem(todo: TodoListRow): TodoListItem {
  const structuredTitle = todo.title?.trim() || null
  const structuredContent = todo.content?.trim() || null

  return {
    id: todo.id,
    originalText: todo.originalText,
    title: structuredTitle || todo.originalText.slice(0, 32),
    excerpt: structuredContent || todo.originalText,
    lifecycleStatus: todo.lifecycleStatus ?? ASSET_LIFECYCLE_STATUS.ACTIVE,
    archivedAt: todo.archivedAt ?? null,
    trashedAt: todo.trashedAt ?? null,
    timeText: todo.timeText,
    dueAt: todo.dueAt,
    completed: todo.completedAt !== null,
    completedAt: todo.completedAt,
    createdAt: todo.createdAt,
    updatedAt: todo.updatedAt,
  }
}
