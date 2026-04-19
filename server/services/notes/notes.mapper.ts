import 'server-only'

import { ASSET_LIFECYCLE_STATUS } from '@/shared/assets/asset-lifecycle.types'

import type { Note } from './notes.schema'
import type { NoteListItem } from './notes.types'

type NoteListRow = Partial<Pick<
  Note,
  'id' | 'originalText' | 'title' | 'content' | 'summary' | 'lifecycleStatus' | 'archivedAt' | 'trashedAt' | 'createdAt' | 'updatedAt'
>> & Pick<Note, 'id' | 'originalText' | 'createdAt' | 'updatedAt'>

export function toNoteListItem(note: NoteListRow): NoteListItem {
  const title = note.title?.trim() || note.originalText.slice(0, 32)
  const excerpt = note.summary?.trim() || note.content?.trim() || note.originalText

  return {
    id: note.id,
    originalText: note.originalText,
    title,
    excerpt,
    lifecycleStatus: note.lifecycleStatus ?? ASSET_LIFECYCLE_STATUS.ACTIVE,
    archivedAt: note.archivedAt ?? null,
    trashedAt: note.trashedAt ?? null,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }
}
