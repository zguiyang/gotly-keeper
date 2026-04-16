import 'server-only'

import { and, eq } from 'drizzle-orm'

import { db } from '@/server/lib/db'
import { now } from '@/shared/time/dayjs'
import { todos } from './todos.schema'
import type { TodoListItem } from './todos.types'
import { toTodoListItem } from './todos.mapper'

type SetTodoCompletionInput = {
  userId: string
  todoId: string
  completed: boolean
}

export async function setTodoCompletion({
  userId,
  todoId,
  completed,
}: SetTodoCompletionInput): Promise<TodoListItem | null> {
  const [updated] = await db
    .update(todos)
    .set({
      completedAt: completed ? now() : null,
      updatedAt: now(),
    })
    .where(
      and(
        eq(todos.id, todoId),
        eq(todos.userId, userId)
      )
    )
    .returning()

  return updated ? toTodoListItem(updated) : null
}
