import type { WorkspaceToolContext, WorkspaceToolResult, WorkspaceIntent, WorkspaceTarget } from './types'
import type { WorkspaceRunPlannerResult } from './workspace-run-planner'
import type { WorkspaceRunStreamEvent } from '@/shared/workspace/workspace-run-protocol'

export type PhaseContext = {
  runId: string
  userId: string
  onEvent?: (event: WorkspaceRunStreamEvent) => void
}

export function emitEvent(ctx: PhaseContext, event: WorkspaceRunStreamEvent) {
  ctx.onEvent?.(event)
}

export function createRunId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

export function getToolResultError(result: WorkspaceToolResult): { code: string; message: string } | null {
  if (result.ok) {
    return null
  }
  return {
    code: result.code ?? 'EXECUTION_ERROR',
    message: result.message ?? 'Unknown error',
  }
}

export function buildToolContext(userId: string): WorkspaceToolContext {
  return { userId }
}

export function getToolNameFromAction(action: string): string {
  const actionToToolMap: Record<string, string> = {
    create_note: 'create_note',
    create_todo: 'create_todo',
    create_bookmark: 'create_bookmark',
    update_todo: 'update_todo',
    query_assets: 'search_all',
    summarize_assets: 'search_all',
  }
  return actionToToolMap[action] ?? action
}

export function getIntentAndTargetFromToolName(toolName: string): { intent: WorkspaceIntent; target: WorkspaceTarget } {
  if (toolName.startsWith('create_')) {
    const targetMap: Record<string, WorkspaceTarget> = {
      create_note: 'notes',
      create_todo: 'todos',
      create_bookmark: 'bookmarks',
    }
    return { intent: 'create', target: targetMap[toolName] ?? 'mixed' }
  }
  if (toolName.startsWith('update_')) {
    return { intent: 'update', target: 'todos' }
  }
  return { intent: 'query', target: 'mixed' }
}
