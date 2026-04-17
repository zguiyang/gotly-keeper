import 'server-only'

import { ASSET_LIFECYCLE_STATUS } from '@/shared/assets/asset-lifecycle.types'

import type { Note } from './notes.schema'
import type { NoteListItem } from './notes.types'

type NoteListRow = Partial<Pick<
  Note,
  'id' | 'originalText' | 'lifecycleStatus' | 'archivedAt' | 'trashedAt' | 'createdAt' | 'updatedAt'
>> & Pick<Note, 'id' | 'originalText' | 'createdAt' | 'updatedAt'>

export function toNoteListItem(note: NoteListRow): NoteListItem {
  return {
    id: note.id,
    originalText: note.originalText,
    title: note.originalText.slice(0, 32),
    excerpt: note.originalText,
    lifecycleStatus: note.lifecycleStatus ?? ASSET_LIFECYCLE_STATUS.ACTIVE,
    archivedAt: note.archivedAt ?? null,
    trashedAt: note.trashedAt ?? null,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }
}
