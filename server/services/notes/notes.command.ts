import 'server-only'

import { db } from '@/server/lib/db'
import { createAssetRecord } from '@/server/services/assets/create-asset-record'
import { notes } from './notes.schema'
import type { NoteListItem } from './notes.types'
import { toNoteListItem } from './notes.mapper'

export async function createNote(input: {
  userId: string
  text: string
}): Promise<NoteListItem> {
  return createAssetRecord({
    text: input.text,
    insert: async (trimmedText) => {
      const [created] = await db
        .insert(notes)
        .values({
          id: crypto.randomUUID(),
          userId: input.userId,
          originalText: trimmedText,
        })
        .returning()

      return created
    },
    map: toNoteListItem,
  })
}
