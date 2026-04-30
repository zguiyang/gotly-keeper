import 'server-only'

import { parseTodoTime } from '@/server/services/time/todo-time-parser'

import type { DraftWorkspaceTask } from '@/shared/workspace/workspace-run-protocol'

function hasTodoTimeSlot(task: DraftWorkspaceTask) {
  return Boolean(
    task.slots.timeText ||
      task.slots.due ||
      task.slots.time ||
      task.slots.dueAt ||
      task.slots.dueTime ||
      task.slots.dueText ||
      task.slots.dueDate
  )
}

export function normalizeTodoDraftTaskTimes(
  tasks: DraftWorkspaceTask[],
  fallbackTimeHints: string[] = []
): DraftWorkspaceTask[] {
  const todoTaskIndexes = tasks.reduce<number[]>((indexes, task, index) => {
    if (task.target === 'todos') {
      indexes.push(index)
    }

    return indexes
  }, [])

  return tasks.map((task) => {
    if (task.target !== 'todos') {
      return task
    }

    const singleTodoFallbackTimeHint =
      todoTaskIndexes.length === 1 && fallbackTimeHints.length === 1 && !hasTodoTimeSlot(task)
        ? fallbackTimeHints[0]
        : null

    const parsed = parseTodoTime({
      rawText: singleTodoFallbackTimeHint,
      slots: task.slots,
    })

    if (!parsed) {
      return task
    }

    return {
      ...task,
      slots: {
        ...task.slots,
        timeText: parsed.timeText,
        ...(parsed.dueAt ? { dueAt: parsed.dueAt } : {}),
      },
    }
  })
}
