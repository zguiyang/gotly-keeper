import 'server-only'

export type NoteListItem = {
  id: string
  originalText: string
  title: string
  excerpt: string
  createdAt: Date
  updatedAt: Date
}
