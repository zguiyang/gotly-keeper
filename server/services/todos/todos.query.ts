import 'server-only'

import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'

import { TODO_LIST_LIMIT_DEFAULT, TODO_LIST_LIMIT_MAX } from '@/server/lib/config/constants'
import { db } from '@/server/lib/db'
import {
  ASSET_LIFECYCLE_STATUS,
  type AssetLifecycleStatus,
} from '@/shared/assets/asset-lifecycle.types'

import { toTodoListItem } from './todos.mapper'
import { todos } from './todos.schema'

import type { TodoListItem } from './todos.types'

export { type TodoListItem }

type ListTodosOptions = {
  userId: string
  limit?: number
  lifecycleStatus?: AssetLifecycleStatus
  includeLifecycleStatuses?: AssetLifecycleStatus[]
}

type GetTodoByIdOptions = {
  includeLifecycleStatuses?: AssetLifecycleStatus[]
}

type ListIncompleteTodosOptions = {
  includeLifecycleStatuses?: AssetLifecycleStatus[]
}

function resolveLifecycleStatuses(input: {
  lifecycleStatus?: AssetLifecycleStatus
  includeLifecycleStatuses?: AssetLifecycleStatus[]
}): AssetLifecycleStatus[] {
  if (input.includeLifecycleStatuses?.length) {
    return input.includeLifecycleStatuses
  }

  if (input.lifecycleStatus) {
    return [input.lifecycleStatus]
  }

  return [ASSET_LIFECYCLE_STATUS.ACTIVE]
}

function clampTodoListLimit(limit = TODO_LIST_LIMIT_DEFAULT) {
  return Math.min(limit, TODO_LIST_LIMIT_MAX)
}

export async function listTodos({
  userId,
  limit = TODO_LIST_LIMIT_DEFAULT,
  lifecycleStatus,
  includeLifecycleStatuses,
}: ListTodosOptions): Promise<TodoListItem[]> {
  const clampedLimit = clampTodoListLimit(limit)
  const lifecycleStatuses = resolveLifecycleStatuses({ lifecycleStatus, includeLifecycleStatuses })

  const conditions = and(
    eq(todos.userId, userId),
    lifecycleStatuses.length === 1
      ? eq(todos.lifecycleStatus, lifecycleStatuses[0])
      : inArray(todos.lifecycleStatus, lifecycleStatuses)
  )

  const rows = await db
    .select()
    .from(todos)
    .where(conditions)
    .orderBy(desc(todos.createdAt))
    .limit(clampedLimit)

  return rows.map(toTodoListItem)
}

export async function listIncompleteTodos(
  userId: string,
  limit = TODO_LIST_LIMIT_DEFAULT,
  options?: ListIncompleteTodosOptions
): Promise<TodoListItem[]> {
  const lifecycleStatuses = resolveLifecycleStatuses({
    includeLifecycleStatuses: options?.includeLifecycleStatuses,
  })

  const conditions = and(
    eq(todos.userId, userId),
    isNull(todos.completedAt),
    lifecycleStatuses.length === 1
      ? eq(todos.lifecycleStatus, lifecycleStatuses[0])
      : inArray(todos.lifecycleStatus, lifecycleStatuses)
  )
  const clampedLimit = clampTodoListLimit(limit)

  const rows = await db
    .select()
    .from(todos)
    .where(conditions)
    .orderBy(sql`${todos.dueAt} asc nulls last`, desc(todos.createdAt))
    .limit(clampedLimit)

  return rows.map(toTodoListItem)
}

export async function getTodoById(
  todoId: string,
  userId: string,
  options?: GetTodoByIdOptions
): Promise<TodoListItem | null> {
  const lifecycleStatuses = resolveLifecycleStatuses({
    includeLifecycleStatuses: options?.includeLifecycleStatuses,
  })

  const [row] = await db
    .select()
    .from(todos)
    .where(
      and(
        eq(todos.id, todoId),
        eq(todos.userId, userId),
        lifecycleStatuses.length === 1
          ? eq(todos.lifecycleStatus, lifecycleStatuses[0])
          : inArray(todos.lifecycleStatus, lifecycleStatuses)
      )
    )
    .limit(1)

  return row ? toTodoListItem(row) : null
}
