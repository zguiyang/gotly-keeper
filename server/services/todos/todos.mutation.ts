import 'server-only'

import { and, eq } from 'drizzle-orm'

import { db } from '@/server/lib/db'
import {
  ASSET_LIFECYCLE_STATUS,
  type AssetLifecycleStatus,
} from '@/shared/assets/asset-lifecycle.types'
import { now } from '@/shared/time/dayjs'

import { toTodoListItem } from './todos.mapper'
import { todos } from './todos.schema'

import type { TodoListItem } from './todos.types'

type SetTodoCompletionInput = {
  userId: string
  todoId: string
  completed: boolean
}

function normalizeTextOrThrow(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error('EMPTY_INPUT')
  }

  return trimmed
}

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

async function updateLifecycle(input: {
  userId: string
  todoId: string
  fromStatuses: AssetLifecycleStatus[]
  toStatus: AssetLifecycleStatus
  archivedAt: Date | null
  trashedAt: Date | null
}): Promise<TodoListItem | null> {
  for (const fromStatus of input.fromStatuses) {
    const [updated] = await db
      .update(todos)
      .set({
        lifecycleStatus: input.toStatus,
        archivedAt: input.archivedAt,
        trashedAt: input.trashedAt,
        updatedAt: now(),
      })
      .where(
        and(
          eq(todos.id, input.todoId),
          eq(todos.userId, input.userId),
          eq(todos.lifecycleStatus, fromStatus)
        )
      )
      .returning()

    if (updated) {
      return toTodoListItem(updated)
    }
  }

  return null
}

export async function updateTodo(input: {
  userId: string
  todoId: string
  rawInput: string
  title?: string | null
  content?: string | null
  timeText?: string | null
  dueAt?: Date | null
}): Promise<TodoListItem | null> {
  const normalizedTitle = normalizeStructuredField(input.title)
  const normalizedContent = normalizeStructuredField(input.content)
  const normalizedTimeText = normalizeStructuredField(input.timeText)
  const trimmedText = normalizeTextOrThrow(input.rawInput)

  const [updated] = await db
    .update(todos)
    .set({
      originalText: trimmedText,
      title: normalizedTitle,
      content: normalizedContent,
      timeText: normalizedTimeText,
      dueAt: input.dueAt,
      updatedAt: now(),
    })
    .where(
      and(
        eq(todos.id, input.todoId),
        eq(todos.userId, input.userId),
        eq(todos.lifecycleStatus, ASSET_LIFECYCLE_STATUS.ACTIVE)
      )
    )
    .returning()

  return updated ? toTodoListItem(updated) : null
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
        eq(todos.userId, userId),
        eq(todos.lifecycleStatus, ASSET_LIFECYCLE_STATUS.ACTIVE)
      )
    )
    .returning()

  return updated ? toTodoListItem(updated) : null
}

export async function archiveTodo(input: {
  userId: string
  todoId: string
}): Promise<TodoListItem | null> {
  return updateLifecycle({
    userId: input.userId,
    todoId: input.todoId,
    fromStatuses: [ASSET_LIFECYCLE_STATUS.ACTIVE],
    toStatus: ASSET_LIFECYCLE_STATUS.ARCHIVED,
    archivedAt: now(),
    trashedAt: null,
  })
}

export async function unarchiveTodo(input: {
  userId: string
  todoId: string
}): Promise<TodoListItem | null> {
  return updateLifecycle({
    userId: input.userId,
    todoId: input.todoId,
    fromStatuses: [ASSET_LIFECYCLE_STATUS.ARCHIVED],
    toStatus: ASSET_LIFECYCLE_STATUS.ACTIVE,
    archivedAt: null,
    trashedAt: null,
  })
}

export async function moveTodoToTrash(input: {
  userId: string
  todoId: string
}): Promise<TodoListItem | null> {
  return updateLifecycle({
    userId: input.userId,
    todoId: input.todoId,
    fromStatuses: [ASSET_LIFECYCLE_STATUS.ACTIVE, ASSET_LIFECYCLE_STATUS.ARCHIVED],
    toStatus: ASSET_LIFECYCLE_STATUS.TRASHED,
    archivedAt: null,
    trashedAt: now(),
  })
}

export async function restoreTodoFromTrash(input: {
  userId: string
  todoId: string
}): Promise<TodoListItem | null> {
  return updateLifecycle({
    userId: input.userId,
    todoId: input.todoId,
    fromStatuses: [ASSET_LIFECYCLE_STATUS.TRASHED],
    toStatus: ASSET_LIFECYCLE_STATUS.ACTIVE,
    archivedAt: null,
    trashedAt: null,
  })
}

export async function purgeTodo(input: {
  userId: string
  todoId: string
}): Promise<boolean> {
  const deleted = await db
    .delete(todos)
    .where(
      and(
        eq(todos.id, input.todoId),
        eq(todos.userId, input.userId),
        eq(todos.lifecycleStatus, ASSET_LIFECYCLE_STATUS.TRASHED)
      )
    )
    .returning({ id: todos.id })

  return deleted.length > 0
}
