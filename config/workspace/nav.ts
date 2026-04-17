import { Bot, FileText, CheckSquare, Bookmark, Package, Archive, Trash2 } from 'lucide-react'
import { type LucideIcon } from 'lucide-react'

export interface WorkspaceNavItem {
  icon: LucideIcon
  label: string
  href: string
}

export const workspaceNavItems: WorkspaceNavItem[] = [
  { icon: Bot, label: '启动台', href: '/workspace' },
  { icon: FileText, label: '笔记', href: '/workspace/notes' },
  { icon: CheckSquare, label: '待办', href: '/workspace/todos' },
  { icon: Bookmark, label: '书签', href: '/workspace/bookmarks' },
  { icon: Package, label: '知识库', href: '/workspace/all' },
  { icon: Archive, label: '归档', href: '/workspace/archive' },
  { icon: Trash2, label: '回收站', href: '/workspace/trash' },
]

export function isWorkspaceNavItemActive(pathname: string, href: string): boolean {
  if (href === '/workspace') {
    return pathname === '/workspace'
  }
  return pathname.startsWith(href)
}
