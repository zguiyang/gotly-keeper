import { FileText, Link2, StickyNote } from 'lucide-react'

export const assetTypePresentation = {
  note: {
    icon: FileText,
    iconBg: 'bg-type-note-bg',
    iconColor: 'text-type-note',
    markerClassName: 'bg-type-note',
    label: '笔记',
  },
  link: {
    icon: Link2,
    iconBg: 'bg-type-link-bg',
    iconColor: 'text-type-link',
    markerClassName: 'bg-type-link',
    label: '书签',
  },
  todo: {
    icon: StickyNote,
    iconBg: 'bg-type-todo-bg',
    iconColor: 'text-type-todo',
    markerClassName: 'bg-type-todo',
    label: '待办',
  },
} as const

export type AssetType = keyof typeof assetTypePresentation
