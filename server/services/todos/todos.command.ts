import 'server-only'

import { db } from '@/server/lib/db'
import { todos } from './todos.schema'
import type { TodoListItem } from './todos.types'
import { toTodoListItem } from './todos.mapper'

export async function createTodo(input: {
  userId: string
  text: string
  timeText?: string | null
  dueAt?: Date | null
}): Promise<TodoListItem> {
  const trimmed = input.text.trim()
  if (!trimmed) {
    throw new Error('EMPTY_INPUT')
  }

  const [created] = await db
    .insert(todos)
    .values({
      id: crypto.randomUUID(),
      userId: input.userId,
      originalText: trimmed,
      timeText: input.timeText ?? null,
      dueAt: input.dueAt ?? null,
    })
    .returning()

  return toTodoListItem(created)
}
