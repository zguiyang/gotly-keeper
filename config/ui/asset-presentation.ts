import { Bookmark, ListTodo, NotepadText } from 'lucide-react'

export const assetTypePresentation = {
  note: {
    icon: NotepadText,
    iconBg: 'bg-type-note-bg',
    iconColor: 'text-type-note',
    markerClassName: 'bg-type-note',
    label: '笔记',
  },
  link: {
    icon: Bookmark,
    iconBg: 'bg-type-link-bg',
    iconColor: 'text-type-link',
    markerClassName: 'bg-type-link',
    label: '书签',
  },
  todo: {
    icon: ListTodo,
    iconBg: 'bg-type-todo-bg',
    iconColor: 'text-type-todo',
    markerClassName: 'bg-type-todo',
    label: '待办',
  },
} as const

export type AssetType = keyof typeof assetTypePresentation
