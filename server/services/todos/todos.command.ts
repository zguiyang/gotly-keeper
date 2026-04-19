import 'server-only'

import { db } from '@/server/lib/db'
import { createAssetRecord } from '@/server/services/assets/create-asset-record'
import { todos } from './todos.schema'
import type { TodoListItem } from './todos.types'
import { toTodoListItem } from './todos.mapper'

function normalizeStructuredField(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return null
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function getCreateTodoInputText(input: {
  text?: string
  rawInput?: string
  title?: string | null
  content?: string | null
}): string {
  if (input.rawInput !== undefined) {
    return input.rawInput
  }

  if (input.text !== undefined) {
    return input.text
  }

  const normalizedTitle = normalizeStructuredField(input.title)
  const normalizedContent = normalizeStructuredField(input.content)

  return [normalizedTitle, normalizedContent].filter((value): value is string => Boolean(value)).join('\n\n')
}

export async function createTodo(input: {
  userId: string
  text?: string
  rawInput?: string
  title?: string | null
  content?: string | null
  timeText?: string | null
  dueAt?: Date | null
}): Promise<TodoListItem> {
  const normalizedTitle = normalizeStructuredField(input.title)
  const normalizedContent = normalizeStructuredField(input.content)
  const normalizedTimeText = normalizeStructuredField(input.timeText)

  return createAssetRecord({
    text: getCreateTodoInputText(input),
    insert: async (trimmedText) => {
      const [created] = await db
        .insert(todos)
        .values({
          id: crypto.randomUUID(),
          userId: input.userId,
          originalText: trimmedText,
          title: normalizedTitle ?? null,
          content: normalizedContent ?? null,
          timeText: normalizedTimeText ?? null,
          dueAt: input.dueAt ?? null,
        })
        .returning()

      return created
    },
    map: toTodoListItem,
  })
}
