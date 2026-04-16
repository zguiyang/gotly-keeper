import 'server-only'

import { db } from '@/server/lib/db'
import { notes } from './notes.schema'
import type { NoteListItem } from './notes.types'
import { toNoteListItem } from './notes.mapper'

export async function createNote(input: {
  userId: string
  text: string
}): Promise<NoteListItem> {
  const trimmed = input.text.trim()
  if (!trimmed) {
    throw new Error('EMPTY_INPUT')
  }

  const [created] = await db
    .insert(notes)
    .values({
      id: crypto.randomUUID(),
      userId: input.userId,
      originalText: trimmed,
    })
    .returning()

  return toNoteListItem(created)
}
