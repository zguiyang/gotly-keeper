import 'server-only'

export type TodoListItem = {
  id: string
  originalText: string
  title: string
  excerpt: string
  timeText: string | null
  dueAt: Date | null
  completed: boolean
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
