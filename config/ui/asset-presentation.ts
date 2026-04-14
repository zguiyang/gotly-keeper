import { FileText, Link2, StickyNote } from 'lucide-react'

export const assetTypePresentation = {
  note: { icon: FileText, iconBg: 'bg-primary/10', iconColor: 'text-primary', label: '笔记' },
  link: { icon: Link2, iconBg: 'bg-secondary/10', iconColor: 'text-secondary', label: '书签' },
  todo: { icon: StickyNote, iconBg: 'bg-tertiary/10', iconColor: 'text-tertiary', label: '待办' },
} as const

export type AssetType = keyof typeof assetTypePresentation
