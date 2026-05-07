import 'server-only'

import { findWorkspaceCreateDuplicates } from '@/server/services/workspace/workspace-assets.service'

import type { WorkspaceRunPlannerResult } from './workspace-run-planner'
import type { DraftWorkspaceTask, WorkspaceCandidate } from '@/shared/workspace/workspace-run-protocol'

export type ReviewableDuplicateCandidate = {
  stepId: string
  target: 'todo' | 'note' | 'bookmark'
  source?: 'bookmark_precheck' | 'plan_duplicate_scan'
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

function mapDraftTargetToDuplicateTarget(target: DraftWorkspaceTask['target']) {
  if (target === 'todos') return 'todo' as const
  if (target === 'notes') return 'note' as const
  if (target === 'bookmarks') return 'bookmark' as const
  return null
}

export function inferModelDuplicateCandidates(input: {
  draftTasks: DraftWorkspaceTask[]
  plannerResult: WorkspaceRunPlannerResult
}): ReviewableDuplicateCandidate[] {
  const candidates: ReviewableDuplicateCandidate[] = []

  for (const [index, draftTask] of input.draftTasks.entries()) {
    if (draftTask.intent !== 'create' || draftTask.repeatRelation !== 'duplicate_of_previous') {
      continue
    }

    const previousDraftTask = input.draftTasks[index - 1]
    const step = input.plannerResult.steps[index]
    const previousStep = input.plannerResult.steps[index - 1]
    const target = mapDraftTargetToDuplicateTarget(draftTask.target)

    if (!previousDraftTask || !step || !previousStep || !target) {
      continue
    }

    const previousLabel =
      previousDraftTask.cleanTitle?.trim() ||
      previousStep.title?.trim() ||
      previousDraftTask.title.trim()

    if (!previousLabel) {
      continue
    }

    candidates.push({
      stepId: step.id,
      target,
      duplicates: [
        {
          id: `draft:${previousStep.id}`,
          label: previousLabel,
          preview: previousStep.title?.trim() || previousLabel,
          reason: '与上一条记录内容重复',
        },
      ],
    })
  }

  return candidates
}

export function mergeDuplicateCandidates(
  primary: ReviewableDuplicateCandidate[],
  secondary: ReviewableDuplicateCandidate[]
) {
  const byStepId = new Map<string, ReviewableDuplicateCandidate>()

  for (const candidate of [...primary, ...secondary]) {
    if (!byStepId.has(candidate.stepId)) {
      byStepId.set(candidate.stepId, candidate)
    }
  }

  return [...byStepId.values()]
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

  const duplicates = await findWorkspaceCreateDuplicates({
    userId: input.userId,
    steps: createSteps,
  })

  return duplicates.map((candidate) => ({
    ...candidate,
    source: 'plan_duplicate_scan' as const,
  }))
}

export async function findWorkspaceBookmarkDuplicateCandidate(input: {
  userId: string
  draftTask: DraftWorkspaceTask
  stepId?: string
}): Promise<ReviewableDuplicateCandidate | null> {
  if (input.draftTask.intent !== 'create' || input.draftTask.target !== 'bookmarks') {
    return null
  }

  const url = typeof input.draftTask.slots.url === 'string' ? input.draftTask.slots.url.trim() : ''
  if (!url) {
    return null
  }

  const [result] = await findWorkspaceCreateDuplicates({
    userId: input.userId,
    steps: [
      {
        stepId: input.stepId ?? 'step_1',
        action: 'create_bookmark',
        target: 'bookmarks',
        title: input.draftTask.title,
        content: typeof input.draftTask.slots.content === 'string' ? input.draftTask.slots.content : undefined,
        url,
      },
    ],
  })

  return result
    ? {
        ...result,
        source: 'bookmark_precheck',
      }
    : null
}

export async function findWorkspaceBookmarkDuplicateCandidates(input: {
  userId: string
  draftTasks: DraftWorkspaceTask[]
}): Promise<ReviewableDuplicateCandidate[]> {
  const results = await Promise.all(
    input.draftTasks.map((draftTask, index) =>
      findWorkspaceBookmarkDuplicateCandidate({
        userId: input.userId,
        draftTask,
        stepId: `step_${index + 1}`,
      })
    )
  )

  return results.filter((result): result is ReviewableDuplicateCandidate => result !== null)
}
