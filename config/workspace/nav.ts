import { Archive, Bookmark, Bot, Library, ListTodo, NotepadText, Trash2 } from 'lucide-react'
import { type LucideIcon } from 'lucide-react'

export interface WorkspaceNavItem {
  icon: LucideIcon
  label: string
  href: string
  tKey: string
}

export interface WorkspaceNavGroup {
  label: string
  tKey: string
  items: WorkspaceNavItem[]
}

export const workspaceNavGroups: WorkspaceNavGroup[] = [
  {
    label: 'Workspace',
    tKey: 'groups.workspace',
    items: [
      { icon: Bot, label: 'Launchpad', href: '/workspace', tKey: 'items.launchpad' },
      { icon: Library, label: 'Knowledge Base', href: '/workspace/all', tKey: 'items.knowledgeBase' },
    ],
  },
  {
    label: 'Content Type',
    tKey: 'groups.contentType',
    items: [
      { icon: NotepadText, label: 'Notes', href: '/workspace/notes', tKey: 'items.notes' },
      { icon: ListTodo, label: 'Todos', href: '/workspace/todos', tKey: 'items.todos' },
      { icon: Bookmark, label: 'Bookmarks', href: '/workspace/bookmarks', tKey: 'items.bookmarks' },
    ],
  },
  {
    label: 'Management',
    tKey: 'groups.manage',
    items: [
      { icon: Archive, label: 'Archive', href: '/workspace/archive', tKey: 'items.archive' },
      { icon: Trash2, label: 'Trash', href: '/workspace/trash', tKey: 'items.trash' },
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
