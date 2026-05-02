import 'server-only'

import type { BookmarkListItem } from '@/server/services/bookmarks'
import type { NoteListItem } from '@/server/services/notes'
import type { TodoListItem } from '@/server/services/todos'
import type { AssetListItem } from '@/shared/assets/assets.types'

export function toAssetListItemFromNote(note: NoteListItem): AssetListItem {
  return {
    id: note.id,
    originalText: note.originalText,
    title: note.title,
    excerpt: note.excerpt,
    type: 'note',
    content: note.content,
    summary: note.summary,
    url: null,
    timeText: null,
    dueAt: null,
    completed: false,
    bookmarkMeta: null,
    lifecycleStatus: note.lifecycleStatus,
    archivedAt: note.archivedAt,
    trashedAt: note.trashedAt,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }
}

export function toAssetListItemFromTodo(todo: TodoListItem): AssetListItem {
  return {
    id: todo.id,
    originalText: todo.originalText,
    title: todo.title,
    excerpt: todo.excerpt,
    type: 'todo',
    content: todo.content,
    url: null,
    timeText: todo.timeText,
    dueAt: todo.dueAt,
    completed: todo.completed,
    bookmarkMeta: null,
    lifecycleStatus: todo.lifecycleStatus,
    archivedAt: todo.archivedAt,
    trashedAt: todo.trashedAt,
    createdAt: todo.createdAt,
    updatedAt: todo.updatedAt,
  }
}

export function toAssetListItemFromBookmark(bookmark: BookmarkListItem): AssetListItem {
  return {
    id: bookmark.id,
    originalText: bookmark.originalText,
    title: bookmark.title,
    excerpt: bookmark.excerpt,
    type: 'link',
    note: bookmark.note,
    summary: bookmark.summary,
    url: bookmark.url,
    timeText: null,
    dueAt: null,
    completed: false,
    bookmarkMeta: bookmark.bookmarkMeta,
    lifecycleStatus: bookmark.lifecycleStatus,
    archivedAt: bookmark.archivedAt,
    trashedAt: bookmark.trashedAt,
    createdAt: bookmark.createdAt,
    updatedAt: bookmark.updatedAt,
  }
}
