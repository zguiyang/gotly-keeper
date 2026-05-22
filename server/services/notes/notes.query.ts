import 'server-only'

import { and, desc, eq, or } from 'drizzle-orm'

import { NOTE_LIST_LIMIT_DEFAULT, NOTE_LIST_LIMIT_MAX } from '@/server/lib/config/constants'
import { db } from '@/server/lib/db'
import {
  buildDescendingCursorCondition,
  buildLifecycleFilter,
  clampListLimit,
  resolveLifecycleStatuses,
  type CursorPayload,
} from '@/server/services/assets/asset-query-utils'
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

export async function listNotes({
  userId,
  limit = NOTE_LIST_LIMIT_DEFAULT,
  lifecycleStatus,
  includeLifecycleStatuses,
}: ListNotesOptions): Promise<NoteListItem[]> {
  const clampedLimit = clampListLimit(limit, NOTE_LIST_LIMIT_MAX)
  const lifecycleStatuses = resolveLifecycleStatuses({ lifecycleStatus, includeLifecycleStatuses })

  const conditions = and(
    eq(notes.userId, userId),
    buildLifecycleFilter(lifecycleStatuses, notes) ?? undefined
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
  const cursorPayload = decodeCursor<CursorPayload>(cursor)

  const conditions = and(
    eq(notes.userId, userId),
    buildLifecycleFilter(lifecycleStatuses, notes) ?? undefined,
    buildDescendingCursorCondition(notes.createdAt, notes.id, cursorPayload) ?? undefined
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
        buildLifecycleFilter(lifecycleStatuses, notes) ?? undefined
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
