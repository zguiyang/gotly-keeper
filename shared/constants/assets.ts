export type TodoGroupKey = 'today' | 'thisWeek' | 'noDate' | 'completed'

export const groupLabels: Record<TodoGroupKey, string> = {
  today: '今天',
  thisWeek: '本周',
  noDate: '无截止日期',
  completed: '已完成',
}
