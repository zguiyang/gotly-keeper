import 'server-only'

import { and, desc, eq, inArray, lt, or } from 'drizzle-orm'

import { NOTE_LIST_LIMIT_DEFAULT, NOTE_LIST_LIMIT_MAX } from '@/server/lib/config/constants'
import { db } from '@/server/lib/db'
import { createCursorPage, clampPageSize, decodeCursor } from '@/server/services/pagination'
import {
  ASSET_LIFECYCLE_STATUS,
  type AssetLifecycleStatus,
} from '@/shared/assets/asset-lifecycle.types'

import { toNoteListItem } from './notes.mapper'
import { notes } from './notes.schema'

import type { NoteListItem } from './notes.types'

export { type NoteListItem }

type ListNotesOptions = {
  userId: string
  limit?: number
  lifecycleStatus?: AssetLifecycleStatus
  includeLifecycleStatuses?: AssetLifecycleStatus[]
}

type ListNotesPageOptions = {
  userId: string
  pageSize?: number
  cursor?: string | null
  lifecycleStatus?: AssetLifecycleStatus
  includeLifecycleStatuses?: AssetLifecycleStatus[]
}

type GetNoteByIdOptions = {
  includeLifecycleStatuses?: AssetLifecycleStatus[]
}

type NoteCursorPayload = {
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

function clampNoteListLimit(limit = NOTE_LIST_LIMIT_DEFAULT) {
  return Math.min(limit, NOTE_LIST_LIMIT_MAX)
}

function buildDescendingCursorCondition(
  cursor: NoteCursorPayload | null
) {
  if (!cursor) {
    return null
  }

  const cursorCreatedAt = new Date(cursor.createdAt)
  if (Number.isNaN(cursorCreatedAt.getTime())) {
    throw new Error('INVALID_CURSOR')
  }

  return or(
    lt(notes.createdAt, cursorCreatedAt),
    and(eq(notes.createdAt, cursorCreatedAt), lt(notes.id, cursor.id))
  )
}

export async function listNotes({
  userId,
  limit = NOTE_LIST_LIMIT_DEFAULT,
  lifecycleStatus,
  includeLifecycleStatuses,
}: ListNotesOptions): Promise<NoteListItem[]> {
  const clampedLimit = clampNoteListLimit(limit)
  const lifecycleStatuses = resolveLifecycleStatuses({ lifecycleStatus, includeLifecycleStatuses })

  const conditions = and(
    eq(notes.userId, userId),
    lifecycleStatuses.length === 1
      ? eq(notes.lifecycleStatus, lifecycleStatuses[0])
      : inArray(notes.lifecycleStatus, lifecycleStatuses)
  )

  const rows = await db
    .select()
    .from(notes)
    .where(conditions)
    .orderBy(desc(notes.createdAt))
    .limit(clampedLimit)

  return rows.map(toNoteListItem)
}

export async function listNotesPage({
  userId,
  pageSize = NOTE_LIST_LIMIT_DEFAULT,
  cursor,
  lifecycleStatus,
  includeLifecycleStatuses,
}: ListNotesPageOptions): Promise<{
  items: NoteListItem[]
  pageInfo: {
    pageSize: number
    nextCursor: string | null
    hasNextPage: boolean
  }
}> {
  const clampedPageSize = clampPageSize(pageSize, 1, NOTE_LIST_LIMIT_MAX)
  const lifecycleStatuses = resolveLifecycleStatuses({ lifecycleStatus, includeLifecycleStatuses })
  const cursorPayload = decodeCursor<NoteCursorPayload>(cursor)

  const conditions = and(
    eq(notes.userId, userId),
    lifecycleStatuses.length === 1
      ? eq(notes.lifecycleStatus, lifecycleStatuses[0])
      : inArray(notes.lifecycleStatus, lifecycleStatuses),
    buildDescendingCursorCondition(cursorPayload) ?? undefined
  )

  const rows = await db
    .select()
    .from(notes)
    .where(conditions)
    .orderBy(desc(notes.createdAt), desc(notes.id))
    .limit(clampedPageSize + 1)

  return createCursorPage({
    rows: rows.map(toNoteListItem),
    pageSize: clampedPageSize,
    getCursorPayload: (item) => ({
      createdAt: item.createdAt.toISOString(),
      id: item.id,
    }),
  })
}

export async function getNoteById(
  noteId: string,
  userId: string,
  options?: GetNoteByIdOptions
): Promise<NoteListItem | null> {
  const lifecycleStatuses = resolveLifecycleStatuses({
    includeLifecycleStatuses: options?.includeLifecycleStatuses,
  })

  const [row] = await db
    .select()
    .from(notes)
    .where(
      and(
        eq(notes.id, noteId),
        eq(notes.userId, userId),
        lifecycleStatuses.length === 1
          ? eq(notes.lifecycleStatus, lifecycleStatuses[0])
          : inArray(notes.lifecycleStatus, lifecycleStatuses)
      )
    )
    .limit(1)

  return row ? toNoteListItem(row) : null
}

export async function findDuplicateNotes(input: {
  userId: string
  content: string
}): Promise<NoteListItem[]> {
  const content = input.content.trim()
  if (!content) {
    return []
  }

  const rows = await db
    .select()
    .from(notes)
    .where(
      and(
        eq(notes.userId, input.userId),
        eq(notes.lifecycleStatus, ASSET_LIFECYCLE_STATUS.ACTIVE),
        or(eq(notes.content, content), eq(notes.originalText, content))
      )
    )
    .orderBy(desc(notes.createdAt))
    .limit(NOTE_LIST_LIMIT_DEFAULT)

  return rows.map(toNoteListItem)
}
