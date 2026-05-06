import 'server-only'

import { resolveDatetime } from '@/server/services/time/resolve-datetime-tool'
import { resolveTodoTimeWithAi } from '@/server/services/time/resolve-todo-time-with-ai'

import type { DraftWorkspaceTask } from '@/shared/workspace/workspace-run-protocol'

export type TimeResolutionKind = 'clear' | 'vague' | 'unresolved'

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

function classifyTimeResolution(timeText: string, dueAt: string | null | undefined, referenceTime: string, aiClarity?: string | null | undefined): TimeResolutionKind {
  if (aiClarity === 'clear' || aiClarity === 'vague' || aiClarity === 'unresolved') {
    return aiClarity
  }

  if (dueAt) {
    return 'clear'
  }

  try {
    const dtResult = resolveDatetime({ phrase: timeText, referenceTime })
    if (dtResult.granularity === 'vague') {
      return 'vague'
    }
    return 'unresolved'
  } catch {
    return 'unresolved'
  }
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

    const newSlots: Record<string, string> = {
      ...task.slots,
      ...(parsed.timeText ? { timeText: parsed.timeText } : {}),
      ...(parsed.dueAt ? { dueAt: parsed.dueAt } : {}),
    }

    if (parsed.timeText) {
      newSlots.timeResolutionKind = classifyTimeResolution(parsed.timeText, parsed.dueAt, options.referenceTime, parsed.resolutionKind)
    }

    return {
      ...task,
      slots: newSlots,
    }
  }))
}
