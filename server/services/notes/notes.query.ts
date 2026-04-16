import 'server-only'

import { and, desc, eq } from 'drizzle-orm'

import { NOTE_LIST_LIMIT_DEFAULT, NOTE_LIST_LIMIT_MAX } from '@/server/lib/config/constants'
import { db } from '@/server/lib/db'
import { notes } from './notes.schema'
import type { NoteListItem } from './notes.types'
import { toNoteListItem } from './notes.mapper'

export { type NoteListItem }

type ListNotesOptions = {
  userId: string
  limit?: number
}

function clampNoteListLimit(limit = NOTE_LIST_LIMIT_DEFAULT) {
  return Math.min(limit, NOTE_LIST_LIMIT_MAX)
}

export async function listNotes({
  userId,
  limit = NOTE_LIST_LIMIT_DEFAULT,
}: ListNotesOptions): Promise<NoteListItem[]> {
  const clampedLimit = clampNoteListLimit(limit)

  const rows = await db
    .select()
    .from(notes)
    .where(eq(notes.userId, userId))
    .orderBy(desc(notes.createdAt))
    .limit(clampedLimit)

  return rows.map(toNoteListItem)
}

export async function getNoteById(noteId: string, userId: string): Promise<NoteListItem | null> {
  const [row] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
    .limit(1)

  return row ? toNoteListItem(row) : null
}
