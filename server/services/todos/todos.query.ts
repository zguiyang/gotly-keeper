import 'server-only'

import { and, asc, desc, eq, inArray, isNotNull, isNull, lt, or, sql } from 'drizzle-orm'

import { TODO_LIST_LIMIT_DEFAULT, TODO_LIST_LIMIT_MAX } from '@/server/lib/config/constants'
import { db } from '@/server/lib/db'
import { createCursorPage, clampPageSize, decodeCursor } from '@/server/services/pagination'
import {
  ASSET_LIFECYCLE_STATUS,
  type AssetLifecycleStatus,
} from '@/shared/assets/asset-lifecycle.types'
import { ASIA_SHANGHAI_TIME_ZONE, dayjs } from '@/shared/time/dayjs'

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

type ListTodosPageOptions = {
  userId: string
  pageSize?: number
  cursor?: string | null
  lifecycleStatus?: AssetLifecycleStatus
  includeLifecycleStatuses?: AssetLifecycleStatus[]
}

type ListTodosByDueDateOptions = {
  userId: string
  startsAt: Date
  endsAt: Date
  lifecycleStatus?: AssetLifecycleStatus
  includeLifecycleStatuses?: AssetLifecycleStatus[]
}

type ListTodoDateMarkersOptions = ListTodosByDueDateOptions

type ListUnscheduledTodosOptions = {
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

type ListOverdueTodosOptions = {
  userId: string
  before: Date
  limit?: number
  lifecycleStatus?: AssetLifecycleStatus
  includeLifecycleStatuses?: AssetLifecycleStatus[]
}

type ListCompletedTodosOptions = {
  userId: string
  limit?: number
  lifecycleStatus?: AssetLifecycleStatus
  includeLifecycleStatuses?: AssetLifecycleStatus[]
}

type TodoCursorPayload = {
  createdAt: string
  id: string
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

function buildDescendingCursorCondition(cursor: TodoCursorPayload | null) {
  if (!cursor) {
    return null
  }

  const cursorCreatedAt = new Date(cursor.createdAt)
  if (Number.isNaN(cursorCreatedAt.getTime())) {
    throw new Error('INVALID_CURSOR')
  }

  return or(
    lt(todos.createdAt, cursorCreatedAt),
    and(eq(todos.createdAt, cursorCreatedAt), lt(todos.id, cursor.id))
  )
}

function normalizeDateRange({ startsAt, endsAt }: { startsAt: Date; endsAt: Date }) {
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || startsAt >= endsAt) {
    throw new Error('INVALID_DATE_RANGE')
  }
}

function toDateKey(date: Date) {
  return dayjs(date).tz(ASIA_SHANGHAI_TIME_ZONE).format('YYYY-MM-DD')
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

export async function listTodosPage({
  userId,
  pageSize = TODO_LIST_LIMIT_DEFAULT,
  cursor,
  lifecycleStatus,
  includeLifecycleStatuses,
}: ListTodosPageOptions): Promise<{
  items: TodoListItem[]
  pageInfo: {
    pageSize: number
    nextCursor: string | null
    hasNextPage: boolean
  }
}> {
  const clampedPageSize = clampPageSize(pageSize, 1, TODO_LIST_LIMIT_MAX)
  const lifecycleStatuses = resolveLifecycleStatuses({ lifecycleStatus, includeLifecycleStatuses })
  const cursorPayload = decodeCursor<TodoCursorPayload>(cursor)

  const conditions = and(
    eq(todos.userId, userId),
    lifecycleStatuses.length === 1
      ? eq(todos.lifecycleStatus, lifecycleStatuses[0])
      : inArray(todos.lifecycleStatus, lifecycleStatuses),
    buildDescendingCursorCondition(cursorPayload) ?? undefined
  )

  const rows = await db
    .select()
    .from(todos)
    .where(conditions)
    .orderBy(desc(todos.createdAt), desc(todos.id))
    .limit(clampedPageSize + 1)

  return createCursorPage({
    rows: rows.map(toTodoListItem),
    pageSize: clampedPageSize,
    getCursorPayload: (item) => ({
      createdAt: item.createdAt.toISOString(),
      id: item.id,
    }),
  })
}

export async function listTodosByDueDate({
  userId,
  startsAt,
  endsAt,
  lifecycleStatus,
  includeLifecycleStatuses,
}: ListTodosByDueDateOptions): Promise<TodoListItem[]> {
  normalizeDateRange({ startsAt, endsAt })

  const lifecycleStatuses = resolveLifecycleStatuses({ lifecycleStatus, includeLifecycleStatuses })
  const conditions = and(
    eq(todos.userId, userId),
    lifecycleStatuses.length === 1
      ? eq(todos.lifecycleStatus, lifecycleStatuses[0])
      : inArray(todos.lifecycleStatus, lifecycleStatuses),
    sql`${todos.dueAt} >= ${startsAt}`,
    sql`${todos.dueAt} < ${endsAt}`
  )

  const rows = await db
    .select()
    .from(todos)
    .where(conditions)
    .orderBy(asc(todos.dueAt), desc(todos.createdAt))

  return rows.map(toTodoListItem)
}

export async function listTodoDateMarkers({
  userId,
  startsAt,
  endsAt,
  lifecycleStatus,
  includeLifecycleStatuses,
}: ListTodoDateMarkersOptions): Promise<string[]> {
  normalizeDateRange({ startsAt, endsAt })

  const lifecycleStatuses = resolveLifecycleStatuses({ lifecycleStatus, includeLifecycleStatuses })
  const rows = await db
    .select({
      dueAt: todos.dueAt,
    })
    .from(todos)
    .where(
      and(
        eq(todos.userId, userId),
        lifecycleStatuses.length === 1
          ? eq(todos.lifecycleStatus, lifecycleStatuses[0])
          : inArray(todos.lifecycleStatus, lifecycleStatuses),
        sql`${todos.dueAt} >= ${startsAt}`,
        sql`${todos.dueAt} < ${endsAt}`
      )
    )

  return Array.from(
    new Set(
      rows
        .map((row) => row.dueAt)
        .filter((dueAt): dueAt is Date => dueAt instanceof Date && !Number.isNaN(dueAt.getTime()))
        .map((dueAt) => toDateKey(dueAt))
    )
  ).sort()
}

export async function listUnscheduledTodos({
  userId,
  limit = TODO_LIST_LIMIT_DEFAULT,
  lifecycleStatus,
  includeLifecycleStatuses,
}: ListUnscheduledTodosOptions): Promise<TodoListItem[]> {
  const clampedLimit = clampTodoListLimit(limit)
  const lifecycleStatuses = resolveLifecycleStatuses({ lifecycleStatus, includeLifecycleStatuses })

  const rows = await db
    .select()
    .from(todos)
    .where(
      and(
        eq(todos.userId, userId),
        isNull(todos.dueAt),
        lifecycleStatuses.length === 1
          ? eq(todos.lifecycleStatus, lifecycleStatuses[0])
          : inArray(todos.lifecycleStatus, lifecycleStatuses)
      )
    )
    .orderBy(desc(todos.createdAt), desc(todos.id))
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

export async function listOverdueTodos({
  userId,
  before,
  limit = TODO_LIST_LIMIT_DEFAULT,
  lifecycleStatus,
  includeLifecycleStatuses,
}: ListOverdueTodosOptions): Promise<TodoListItem[]> {
  if (Number.isNaN(before.getTime())) {
    throw new Error('INVALID_DATE_RANGE')
  }

  const clampedLimit = clampTodoListLimit(limit)
  const lifecycleStatuses = resolveLifecycleStatuses({ lifecycleStatus, includeLifecycleStatuses })

  const rows = await db
    .select()
    .from(todos)
    .where(
      and(
        eq(todos.userId, userId),
        isNull(todos.completedAt),
        isNotNull(todos.dueAt),
        sql`${todos.dueAt} < ${before}`,
        lifecycleStatuses.length === 1
          ? eq(todos.lifecycleStatus, lifecycleStatuses[0])
          : inArray(todos.lifecycleStatus, lifecycleStatuses)
      )
    )
    .orderBy(asc(todos.dueAt), desc(todos.createdAt), desc(todos.id))
    .limit(clampedLimit)

  return rows.map(toTodoListItem)
}

export async function listCompletedTodos({
  userId,
  limit = TODO_LIST_LIMIT_DEFAULT,
  lifecycleStatus,
  includeLifecycleStatuses,
}: ListCompletedTodosOptions): Promise<TodoListItem[]> {
  const clampedLimit = clampTodoListLimit(limit)
  const lifecycleStatuses = resolveLifecycleStatuses({ lifecycleStatus, includeLifecycleStatuses })

  const rows = await db
    .select()
    .from(todos)
    .where(
      and(
        eq(todos.userId, userId),
        isNotNull(todos.completedAt),
        lifecycleStatuses.length === 1
          ? eq(todos.lifecycleStatus, lifecycleStatuses[0])
          : inArray(todos.lifecycleStatus, lifecycleStatuses)
      )
    )
    .orderBy(desc(todos.completedAt), desc(todos.updatedAt), desc(todos.id))
    .limit(clampedLimit)

  return rows.map(toTodoListItem)
}

export async function findDuplicateTodos(input: {
  userId: string
  title: string
  dueAt?: Date | null
  timeText?: string | null
}): Promise<TodoListItem[]> {
  const title = input.title.trim()
  if (!title) {
    return []
  }

  const dueAtCondition = input.dueAt instanceof Date
    ? eq(todos.dueAt, input.dueAt)
    : isNull(todos.dueAt)
  const timeText = input.timeText?.trim()
  const timeTextCondition = timeText ? eq(todos.timeText, timeText) : isNull(todos.timeText)

  const rows = await db
    .select()
    .from(todos)
    .where(
      and(
        eq(todos.userId, input.userId),
        eq(todos.lifecycleStatus, ASSET_LIFECYCLE_STATUS.ACTIVE),
        or(eq(todos.title, title), eq(todos.originalText, title)),
        dueAtCondition,
        timeTextCondition
      )
    )
    .orderBy(desc(todos.createdAt))
    .limit(TODO_LIST_LIMIT_DEFAULT)

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
