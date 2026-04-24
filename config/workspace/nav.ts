import { Archive, Bookmark, Bot, Library, ListTodo, NotepadText, Trash2 } from 'lucide-react'
import { type LucideIcon } from 'lucide-react'

export interface WorkspaceNavItem {
  icon: LucideIcon
  label: string
  href: string
}

export interface WorkspaceNavGroup {
  label: string
  items: WorkspaceNavItem[]
}

export const workspaceNavGroups: WorkspaceNavGroup[] = [
  {
    label: '工作台',
    items: [
      { icon: Bot, label: '启动台', href: '/workspace' },
      { icon: Library, label: '知识库', href: '/workspace/all' },
    ],
  },
  {
    label: '内容类型',
    items: [
      { icon: NotepadText, label: '笔记', href: '/workspace/notes' },
      { icon: ListTodo, label: '待办', href: '/workspace/todos' },
      { icon: Bookmark, label: '书签', href: '/workspace/bookmarks' },
    ],
  },
  {
    label: '管理',
    items: [
      { icon: Archive, label: '归档', href: '/workspace/archive' },
      { icon: Trash2, label: '回收站', href: '/workspace/trash' },
    ],
  },
]

export const workspaceNavItems = workspaceNavGroups.flatMap((group) => group.items)

export function isWorkspaceNavItemActive(pathname: string, href: string): boolean {
  if (href === '/workspace') {
    return pathname === '/workspace'
  }
  return pathname.startsWith(href)
}
