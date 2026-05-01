import 'server-only'

import { findWorkspaceCreateDuplicates } from '@/server/services/workspace/workspace-assets.service'

import type { WorkspaceRunPlannerResult } from './workspace-run-planner'
import type { WorkspaceCandidate } from '@/shared/workspace/workspace-run-protocol'

export type ReviewableDuplicateCandidate = {
  stepId: string
  target: 'todo' | 'note' | 'bookmark'
  duplicates: WorkspaceCandidate[]
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value !== 'string') {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function findWorkspaceRunDuplicateCandidates(input: {
  userId: string
  plannerResult: WorkspaceRunPlannerResult
}): Promise<ReviewableDuplicateCandidate[]> {
  const createSteps = input.plannerResult.steps
    .filter(
      (step): step is typeof step & { action: 'create_note' | 'create_todo' | 'create_bookmark' } =>
        step.action === 'create_note' ||
        step.action === 'create_todo' ||
        step.action === 'create_bookmark'
    )
    .map((step) => ({
      stepId: step.id,
      action: step.action,
      target: step.target as 'notes' | 'todos' | 'bookmarks',
      title: typeof step.toolInput?.title === 'string' ? step.toolInput.title : step.title,
      content: typeof step.toolInput?.content === 'string' ? step.toolInput.content : undefined,
      url: typeof step.toolInput?.url === 'string' ? step.toolInput.url : undefined,
      timeText:
        typeof step.toolInput?.timeText === 'string' ? step.toolInput.timeText : null,
      dueAt: toDate(step.toolInput?.dueAt),
    }))

  if (createSteps.length === 0) {
    return []
  }

  return findWorkspaceCreateDuplicates({
    userId: input.userId,
    steps: createSteps,
  })
}
