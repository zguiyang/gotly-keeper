import 'server-only'

import { resolveTodoTimeWithAi } from '@/server/services/time/resolve-todo-time-with-ai'

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

export async function normalizeTodoDraftTaskTimes(
  tasks: DraftWorkspaceTask[],
  options: {
    fallbackTimeHints?: string[]
    referenceTime: string
    signal?: AbortSignal
  }
): Promise<DraftWorkspaceTask[]> {
  const fallbackTimeHints = options.fallbackTimeHints ?? []
  const todoTaskIndexes = tasks.reduce<number[]>((indexes, task, index) => {
    if (task.target === 'todos') {
      indexes.push(index)
    }

    return indexes
  }, [])

  return Promise.all(tasks.map(async (task) => {
    if (task.target !== 'todos') {
      return task
    }

    const singleTodoFallbackTimeHint =
      todoTaskIndexes.length === 1 && fallbackTimeHints.length === 1 && !hasTodoTimeSlot(task)
        ? fallbackTimeHints[0]
        : null

    const parsed = await resolveTodoTimeWithAi({
      title: task.title,
      slots: task.slots,
      fallbackTimeHint: singleTodoFallbackTimeHint,
      referenceTime: options.referenceTime,
      signal: options.signal,
    })

    return {
      ...task,
      slots: {
        ...task.slots,
        ...(parsed.timeText ? { timeText: parsed.timeText } : {}),
        ...(parsed.dueAt ? { dueAt: parsed.dueAt } : {}),
      },
    }
  }))
}
