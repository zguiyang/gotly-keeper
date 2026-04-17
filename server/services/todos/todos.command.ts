import 'server-only'

import { db } from '@/server/lib/db'
import { createAssetRecord } from '@/server/services/assets/create-asset-record'
import { todos } from './todos.schema'
import type { TodoListItem } from './todos.types'
import { toTodoListItem } from './todos.mapper'

export async function createTodo(input: {
  userId: string
  text: string
  timeText?: string | null
  dueAt?: Date | null
}): Promise<TodoListItem> {
  return createAssetRecord({
    text: input.text,
    insert: async (trimmedText) => {
      const [created] = await db
        .insert(todos)
        .values({
          id: crypto.randomUUID(),
          userId: input.userId,
          originalText: trimmedText,
          timeText: input.timeText ?? null,
          dueAt: input.dueAt ?? null,
        })
        .returning()

      return created
    },
    map: toTodoListItem,
  })
}
