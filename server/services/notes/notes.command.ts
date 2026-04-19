import 'server-only'

import { db } from '@/server/lib/db'
import { notes } from './notes.schema'
import type { NoteListItem } from './notes.types'
import { toNoteListItem } from './notes.mapper'
import { normalizeNoteWriteInput, type NoteWriteInput } from './notes.write'

export async function createNote(
  input: {
    userId: string
  } & NoteWriteInput
): Promise<NoteListItem> {
  const normalized = normalizeNoteWriteInput(input)

  const [created] = await db
    .insert(notes)
    .values({
      id: crypto.randomUUID(),
      userId: input.userId,
      originalText: normalized.originalText,
      title: normalized.usesStructuredFields ? normalized.title ?? null : null,
      content: normalized.usesStructuredFields ? normalized.content ?? null : null,
      summary: normalized.usesStructuredFields ? normalized.summary ?? null : null,
    })
    .returning()

  return toNoteListItem(created)
}
