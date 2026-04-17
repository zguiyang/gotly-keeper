import 'server-only'

import { and, eq } from 'drizzle-orm'

import { db } from '@/server/lib/db'
import {
  ASSET_LIFECYCLE_STATUS,
  type AssetLifecycleStatus,
} from '@/shared/assets/asset-lifecycle.types'
import { now } from '@/shared/time/dayjs'

import { toNoteListItem } from './notes.mapper'
import { notes } from './notes.schema'

import type { NoteListItem } from './notes.types'

function normalizeTextOrThrow(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error('EMPTY_INPUT')
  }

  return trimmed
}

async function updateLifecycle(input: {
  userId: string
  noteId: string
  fromStatuses: AssetLifecycleStatus[]
  toStatus: AssetLifecycleStatus
  archivedAt: Date | null
  trashedAt: Date | null
}): Promise<NoteListItem | null> {
  for (const fromStatus of input.fromStatuses) {
    const [updated] = await db
      .update(notes)
      .set({
        lifecycleStatus: input.toStatus,
        archivedAt: input.archivedAt,
        trashedAt: input.trashedAt,
        updatedAt: now(),
      })
      .where(
        and(
          eq(notes.id, input.noteId),
          eq(notes.userId, input.userId),
          eq(notes.lifecycleStatus, fromStatus)
        )
      )
      .returning()

    if (updated) {
      return toNoteListItem(updated)
    }
  }

  return null
}

export async function updateNote(input: {
  userId: string
  noteId: string
  text: string
}): Promise<NoteListItem | null> {
  const trimmedText = normalizeTextOrThrow(input.text)

  const [updated] = await db
    .update(notes)
    .set({
      originalText: trimmedText,
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
  return updateLifecycle({
    userId: input.userId,
    noteId: input.noteId,
    fromStatuses: [ASSET_LIFECYCLE_STATUS.ACTIVE],
    toStatus: ASSET_LIFECYCLE_STATUS.ARCHIVED,
    archivedAt: now(),
    trashedAt: null,
  })
}

export async function unarchiveNote(input: {
  userId: string
  noteId: string
}): Promise<NoteListItem | null> {
  return updateLifecycle({
    userId: input.userId,
    noteId: input.noteId,
    fromStatuses: [ASSET_LIFECYCLE_STATUS.ARCHIVED],
    toStatus: ASSET_LIFECYCLE_STATUS.ACTIVE,
    archivedAt: null,
    trashedAt: null,
  })
}

export async function moveNoteToTrash(input: {
  userId: string
  noteId: string
}): Promise<NoteListItem | null> {
  return updateLifecycle({
    userId: input.userId,
    noteId: input.noteId,
    fromStatuses: [ASSET_LIFECYCLE_STATUS.ACTIVE, ASSET_LIFECYCLE_STATUS.ARCHIVED],
    toStatus: ASSET_LIFECYCLE_STATUS.TRASHED,
    archivedAt: null,
    trashedAt: now(),
  })
}

export async function restoreNoteFromTrash(input: {
  userId: string
  noteId: string
}): Promise<NoteListItem | null> {
  return updateLifecycle({
    userId: input.userId,
    noteId: input.noteId,
    fromStatuses: [ASSET_LIFECYCLE_STATUS.TRASHED],
    toStatus: ASSET_LIFECYCLE_STATUS.ACTIVE,
    archivedAt: null,
    trashedAt: null,
  })
}

export async function purgeNote(input: {
  userId: string
  noteId: string
}): Promise<boolean> {
  const deleted = await db
    .delete(notes)
    .where(
      and(
        eq(notes.id, input.noteId),
        eq(notes.userId, input.userId),
        eq(notes.lifecycleStatus, ASSET_LIFECYCLE_STATUS.TRASHED)
      )
    )
    .returning({ id: notes.id })

  return deleted.length > 0
}
