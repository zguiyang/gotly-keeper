import 'server-only'

import type { Note } from './notes.schema'

export type NoteListItem = {
  id: string
  originalText: string
  title: string
  excerpt: string
  createdAt: Date
  updatedAt: Date
}

type NoteListRow = Pick<Note, 'id' | 'originalText' | 'createdAt' | 'updatedAt'>

export function toNoteListItem(note: NoteListRow): NoteListItem {
  return {
    id: note.id,
    originalText: note.originalText,
    title: note.originalText.slice(0, 32),
    excerpt: note.originalText,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }
}
