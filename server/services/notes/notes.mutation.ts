import 'server-only'

import { and, eq } from 'drizzle-orm'

import { db } from '@/server/lib/db'
import { updateAssetLifecycle, purgeAsset } from '@/server/services/assets/asset-mutation-utils'
import { ASSET_LIFECYCLE_STATUS } from '@/shared/assets/asset-lifecycle.types'
import { now } from '@/shared/time/dayjs'

import { toNoteListItem } from './notes.mapper'
import { notes } from './notes.schema'
import { normalizeNoteWriteInput } from './notes.write'

import type { NoteListItem } from './notes.types'

export async function updateNote(
  input: {
    userId: string
    noteId: string
    rawInput: string
    title?: string | null
    content?: string | null
    summary?: string | null
  }
): Promise<NoteListItem | null> {
  const normalized = normalizeNoteWriteInput(input)

  const [updated] = await db
    .update(notes)
    .set({
      originalText: normalized.originalText,
      title: normalized.title,
      content: normalized.content,
      summary: normalized.summary,
      updatedAt: now(),
    })
    .where(
      and(
        eq(notes.id, input.noteId),
        eq(notes.userId, input.userId),
        eq(notes.lifecycleStatus, ASSET_LIFECYCLE_STATUS.ACTIVE)
      )
    )
    .returning()

  return updated ? toNoteListItem(updated) : null
}

export async function archiveNote(input: {
  userId: string
  noteId: string
}): Promise<NoteListItem | null> {
  return updateAssetLifecycle(
    { assetId: input.noteId, userId: input.userId, fromStatuses: [ASSET_LIFECYCLE_STATUS.ACTIVE], toStatus: ASSET_LIFECYCLE_STATUS.ARCHIVED, archivedAt: now(), trashedAt: null },
    { table: notes, toListItem: toNoteListItem }
  )
}

export async function unarchiveNote(input: {
  userId: string
  noteId: string
}): Promise<NoteListItem | null> {
  return updateAssetLifecycle(
    { assetId: input.noteId, userId: input.userId, fromStatuses: [ASSET_LIFECYCLE_STATUS.ARCHIVED], toStatus: ASSET_LIFECYCLE_STATUS.ACTIVE, archivedAt: null, trashedAt: null },
    { table: notes, toListItem: toNoteListItem }
  )
}

export async function moveNoteToTrash(input: {
  userId: string
  noteId: string
}): Promise<NoteListItem | null> {
  return updateAssetLifecycle(
    { assetId: input.noteId, userId: input.userId, fromStatuses: [ASSET_LIFECYCLE_STATUS.ACTIVE, ASSET_LIFECYCLE_STATUS.ARCHIVED], toStatus: ASSET_LIFECYCLE_STATUS.TRASHED, archivedAt: null, trashedAt: now() },
    { table: notes, toListItem: toNoteListItem }
  )
}

export async function restoreNoteFromTrash(input: {
  userId: string
  noteId: string
}): Promise<NoteListItem | null> {
  return updateAssetLifecycle(
    { assetId: input.noteId, userId: input.userId, fromStatuses: [ASSET_LIFECYCLE_STATUS.TRASHED], toStatus: ASSET_LIFECYCLE_STATUS.ACTIVE, archivedAt: null, trashedAt: null },
    { table: notes, toListItem: toNoteListItem }
  )
}

export async function purgeNote(input: {
  userId: string
  noteId: string
}): Promise<boolean> {
  return purgeAsset(input.noteId, input.userId, notes)
}
