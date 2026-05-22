export const filterTabs = [
  { key: 'all', label: 'All' },
  { key: 'note', label: 'Notes' },
  { key: 'link', label: 'Bookmarks' },
  { key: 'todo', label: 'Todos' },
] as const

export const emptyFilterMessages: Record<string, string> = {
  all: 'all',
  note: 'note',
  link: 'link',
  todo: 'todo',
}