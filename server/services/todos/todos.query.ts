import 'server-only'

import { and, desc, eq, isNull, sql } from 'drizzle-orm'

import { TODO_LIST_LIMIT_DEFAULT, TODO_LIST_LIMIT_MAX } from '@/server/lib/config/constants'
import { db } from '@/server/lib/db'
import { todos } from './todos.schema'
import type { TodoListItem } from './todos.types'
import { toTodoListItem } from './todos.mapper'

export { type TodoListItem }

type ListTodosOptions = {
  userId: string
  limit?: number
}

function clampTodoListLimit(limit = TODO_LIST_LIMIT_DEFAULT) {
  return Math.min(limit, TODO_LIST_LIMIT_MAX)
}

export async function listTodos({
  userId,
  limit = TODO_LIST_LIMIT_DEFAULT,
}: ListTodosOptions): Promise<TodoListItem[]> {
  const clampedLimit = clampTodoListLimit(limit)

  const rows = await db
    .select()
    .from(todos)
    .where(eq(todos.userId, userId))
    .orderBy(desc(todos.createdAt))
    .limit(clampedLimit)

  return rows.map(toTodoListItem)
}

export async function listIncompleteTodos(
  userId: string,
  limit = TODO_LIST_LIMIT_DEFAULT
): Promise<TodoListItem[]> {
  const conditions = and(
    eq(todos.userId, userId),
    isNull(todos.completedAt)
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

export async function getTodoById(todoId: string, userId: string): Promise<TodoListItem | null> {
  const [row] = await db
    .select()
    .from(todos)
    .where(and(eq(todos.id, todoId), eq(todos.userId, userId)))
    .limit(1)

  return row ? toTodoListItem(row) : null
}
