export type TodoGroupKey = 'today' | 'thisWeek' | 'noDate' | 'completed'

export const groupLabels: Record<TodoGroupKey, string> = {
  today: 'Today',
  thisWeek: 'This week',
  noDate: 'No date',
  completed: 'Completed',
}
