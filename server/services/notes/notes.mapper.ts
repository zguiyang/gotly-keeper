import 'server-only'

import { ASSET_LIFECYCLE_STATUS } from '@/shared/assets/asset-lifecycle.types'

import type { Note } from './notes.schema'
import type { NoteListItem } from './notes.types'

type NoteListRow = Partial<Pick<
  Note,
  'id' | 'originalText' | 'title' | 'content' | 'summary' | 'lifecycleStatus' | 'archivedAt' | 'trashedAt' | 'createdAt' | 'updatedAt'
>> & Pick<Note, 'id' | 'originalText' | 'createdAt' | 'updatedAt'>

export function toNoteListItem(note: NoteListRow): NoteListItem {
  const content = note.content ?? note.originalText
  const title = note.title?.trim() || content.split('\n').find((line) => line.trim().length > 0)?.trim()?.slice(0, 32) || note.originalText.slice(0, 32)
  const excerpt = content

  return {
    id: note.id,
    originalText: note.originalText,
    title,
    excerpt,
    content,
    summary: note.summary?.trim() || null,
    lifecycleStatus: note.lifecycleStatus ?? ASSET_LIFECYCLE_STATUS.ACTIVE,
    archivedAt: note.archivedAt ?? null,
    trashedAt: note.trashedAt ?? null,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }
}
