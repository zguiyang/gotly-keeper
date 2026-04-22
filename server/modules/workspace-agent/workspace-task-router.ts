import 'server-only'

import type { WorkspaceExecutionPlan, WorkspaceTask, WorkspaceTarget } from './types'

export class WorkspaceTaskRoutingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorkspaceTaskRoutingError'
  }
}

function resolveTarget(task: WorkspaceTask): WorkspaceTarget {
  if (task.target) {
    return task.target
  }

  return 'mixed'
}

function toSearchInput(task: WorkspaceTask) {
  return {
    query: task.query ?? null,
    subjectHint: task.subjectHint ?? null,
    timeRange: task.timeRange ?? null,
    limit: 10,
  }
}

function toRecentItemsInput(task: WorkspaceTask) {
  return {
    targets: ['notes', 'todos', 'bookmarks'] as const,
    timeRange:
      task.timeRange && task.timeRange.type !== 'custom'
        ? { type: task.timeRange.type }
        : { type: 'recent' as const },
    limitPerTarget: 5,
  }
}

function toCreateInput(task: WorkspaceTask) {
  return task.payload ?? {}
}

function toUpdateTodoInput(task: WorkspaceTask) {
  const payload = task.payload ?? {}

  return {
    selector: {
      query: task.query ?? null,
      subjectHint: task.subjectHint ?? null,
    },
    patch: payload,
  }
}

export function routeWorkspaceTask(task: WorkspaceTask): WorkspaceExecutionPlan {
  const target = resolveTarget(task)

  if (task.intent === 'query') {
    if (target === 'notes') {
      return {
        intent: task.intent,
        target,
        toolName: 'search_notes',
        toolInput: toSearchInput(task),
        needsCompose: false,
      }
    }

    if (target === 'todos') {
      return {
        intent: task.intent,
        target,
        toolName: 'search_todos',
        toolInput: {
          ...toSearchInput(task),
          status: 'all',
        },
        needsCompose: false,
      }
    }

    if (target === 'bookmarks') {
      return {
        intent: task.intent,
        target,
        toolName: 'search_bookmarks',
        toolInput: toSearchInput(task),
        needsCompose: false,
      }
    }

    return {
      intent: task.intent,
      target,
      toolName: 'get_recent_items',
      toolInput: toRecentItemsInput(task),
      needsCompose: false,
    }
  }

  if (task.intent === 'summarize') {
    if (target === 'notes') {
      return {
        intent: task.intent,
        target,
        toolName: 'search_notes',
        toolInput: toSearchInput(task),
        needsCompose: true,
      }
    }

    if (target === 'todos') {
      return {
        intent: task.intent,
        target,
        toolName: 'search_todos',
        toolInput: {
          ...toSearchInput(task),
          status: 'all',
        },
        needsCompose: true,
      }
    }

    if (target === 'bookmarks') {
      return {
        intent: task.intent,
        target,
        toolName: 'search_bookmarks',
        toolInput: toSearchInput(task),
        needsCompose: true,
      }
    }

    return {
      intent: task.intent,
      target,
      toolName: 'get_recent_items',
      toolInput: toRecentItemsInput(task),
      needsCompose: true,
    }
  }

  if (task.intent === 'create') {
    if (target === 'notes') {
      return {
        intent: task.intent,
        target,
        toolName: 'create_note',
        toolInput: toCreateInput(task),
        needsCompose: false,
      }
    }

    if (target === 'todos') {
      return {
        intent: task.intent,
        target,
        toolName: 'create_todo',
        toolInput: toCreateInput(task),
        needsCompose: false,
      }
    }

    if (target === 'bookmarks') {
      return {
        intent: task.intent,
        target,
        toolName: 'create_bookmark',
        toolInput: toCreateInput(task),
        needsCompose: false,
      }
    }
  }

  if (task.intent === 'update' && target === 'todos') {
    return {
      intent: task.intent,
      target,
      toolName: 'update_todo',
      toolInput: toUpdateTodoInput(task),
      needsCompose: false,
    }
  }

  throw new WorkspaceTaskRoutingError(
    `Unsupported workspace task combination: ${task.intent} -> ${target}`
  )
}
