import { TodosClient } from '@/components/workspace/todos-client'
import { requireWorkspaceUserAccess } from '@/server/modules/auth/workspace-session'
import {
  listWorkspaceCompletedTodos,
  listWorkspaceTodoDateMarkers,
  listWorkspaceOverdueTodos,
  listWorkspaceTodosByDate,
  listWorkspaceUnscheduledTodos,
} from '@/server/modules/workspace'
import { ASIA_SHANGHAI_TIME_ZONE, dayjs } from '@/shared/time/dayjs'

export default async function TodosPage() {
  const user = await requireWorkspaceUserAccess()
  const today = dayjs().tz(ASIA_SHANGHAI_TIME_ZONE)
  const selectedDate = today.format('YYYY-MM-DD')

  const [selectedDateTodos, dateMarkers, unscheduledTodos, overdueTodos, completedTodos] = await Promise.all([
    listWorkspaceTodosByDate({
      userId: user.id,
      startsAt: today.startOf('day').toDate(),
      endsAt: today.add(1, 'day').startOf('day').toDate(),
    }),
    listWorkspaceTodoDateMarkers({
      userId: user.id,
      startsAt: today.startOf('month').toDate(),
      endsAt: today.add(1, 'month').startOf('month').toDate(),
    }),
    listWorkspaceUnscheduledTodos({ userId: user.id, limit: 50 }),
    listWorkspaceOverdueTodos({ userId: user.id, before: today.startOf('day').toDate(), limit: 50 }),
    listWorkspaceCompletedTodos({ userId: user.id, limit: 20 }),
  ])

  return (
    <TodosClient
      selectedDate={selectedDate}
      todayDate={selectedDate}
      initialCompletedTodos={completedTodos}
      initialOverdueTodos={overdueTodos}
      initialSelectedDateTodos={selectedDateTodos}
      initialDateMarkers={dateMarkers}
      initialUnscheduledTodos={unscheduledTodos}
    />
  )
}
