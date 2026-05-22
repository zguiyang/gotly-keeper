import { Bookmark, ListTodo, NotepadText } from 'lucide-react'

export const assetTypePresentation = {
  note: {
    icon: NotepadText,
    iconBg: 'bg-type-note-bg',
    iconColor: 'text-type-note',
    markerClassName: 'bg-type-note',
    label: 'Note',
    tKey: 'common.assets.note',
  },
  link: {
    icon: Bookmark,
    iconBg: 'bg-type-link-bg',
    iconColor: 'text-type-link',
    markerClassName: 'bg-type-link',
    label: 'Bookmark',
    tKey: 'common.assets.bookmark',
  },
  todo: {
    icon: ListTodo,
    iconBg: 'bg-type-todo-bg',
    iconColor: 'text-type-todo',
    markerClassName: 'bg-type-todo',
    label: 'Todo',
    tKey: 'common.assets.todo',
  },
} as const

export type AssetType = keyof typeof assetTypePresentation

// Maps internal asset type (e.g. "link") to its locale key (e.g. "bookmark")
export function getAssetLocaleKey(type: AssetType): string {
  return assetTypePresentation[type].tKey.split('.').pop() ?? type
}
