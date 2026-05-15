import 'server-only'

import { findWorkspaceCreateDuplicates } from '@/server/services/workspace/workspace-assets.service'

import type { DraftWorkspaceTask, WorkspaceCandidate } from '@/shared/workspace/workspace-run-protocol'

export type ReviewableDuplicateCandidate = {
  stepId: string
  target: 'todo' | 'note' | 'bookmark'
  source?: 'precheck'
  duplicates: WorkspaceCandidate[]
}

function normalizeDuplicateText(value: string | undefined) {
  return value?.trim().replace(/\s+/g, ' ').toLowerCase() ?? ''
}

function buildInBatchDuplicateSignature(draftTask: DraftWorkspaceTask): string | null {
  if (draftTask.intent !== 'create') {
    return null
  }

  if (draftTask.target === 'notes') {
    const content = normalizeDuplicateText(
      draftTask.cleanContent ??
        (typeof draftTask.slots.content === 'string' ? draftTask.slots.content : undefined) ??
        draftTask.cleanTitle ??
        draftTask.title
    )
    return content ? `notes:${content}` : null
  }

  if (draftTask.target === 'todos') {
    const title = normalizeDuplicateText(draftTask.cleanTitle ?? draftTask.title)
    return title ? `todos:${title}` : null
  }

  if (draftTask.target === 'bookmarks') {
    const url = normalizeDuplicateText(
      typeof draftTask.slots.url === 'string' ? draftTask.slots.url : undefined
    )
    return url ? `bookmarks:${url}` : null
  }

  return null
}

function mapDraftTaskTargetToCandidateType(target: DraftWorkspaceTask['target']) {
  if (target === 'notes') return 'note' as const
  if (target === 'todos') return 'todo' as const
  if (target === 'bookmarks') return 'bookmark' as const
  return null
}

function findInBatchCreateDuplicateCandidates(
  draftTasks: DraftWorkspaceTask[]
): ReviewableDuplicateCandidate[] {
  const seen = new Map<
    string,
    {
      draftTask: DraftWorkspaceTask
      stepId: string
    }
  >()
  const duplicates: ReviewableDuplicateCandidate[] = []

  for (const [index, draftTask] of draftTasks.entries()) {
    const signature = buildInBatchDuplicateSignature(draftTask)
    const candidateType = mapDraftTaskTargetToCandidateType(draftTask.target)
    const stepId = `step_${index + 1}`

    if (!signature || !candidateType) {
      continue
    }

    const previous = seen.get(signature)
    if (!previous) {
      seen.set(signature, { draftTask, stepId })
      continue
    }

    duplicates.push({
      stepId,
      target: candidateType,
      duplicates: [
        {
          id: previous.draftTask.id,
          label: previous.draftTask.cleanTitle ?? previous.draftTask.title,
          preview:
            previous.draftTask.cleanContent ??
            previous.draftTask.cleanTitle ??
            previous.draftTask.title,
          type: candidateType,
          reason: '与本次输入中的上一条内容重复',
        },
      ],
    })
  }

  return duplicates
}

export async function findWorkspaceCreateDuplicateCandidate(input: {
  userId: string
  draftTask: DraftWorkspaceTask
  stepId?: string
}): Promise<ReviewableDuplicateCandidate | null> {
  if (input.draftTask.intent !== 'create') {
    return null
  }

  const stepId = input.stepId ?? 'step_1'
  const { target, title, cleanTitle, cleanContent, slots } = input.draftTask

  if (target === 'bookmarks') {
    const url = typeof slots.url === 'string' ? slots.url.trim() : ''
    if (!url) return null

    const [result] = await findWorkspaceCreateDuplicates({
      userId: input.userId,
      steps: [
        {
          stepId,
          action: 'create_bookmark',
          target: 'bookmarks',
          title,
          content: typeof slots.content === 'string' ? slots.content : undefined,
          url,
        },
      ],
    })

    return result ? { ...result, source: 'precheck' as const } : null
  }

  if (target === 'todos') {
    const todoTitle = (cleanTitle ?? title ?? '').trim()
    if (!todoTitle) return null

    const rawDueAt = slots.dueAt
    const dueAt = typeof rawDueAt === 'string'
      ? (() => { const d = new Date(rawDueAt); return Number.isNaN(d.getTime()) ? null : d })()
      : null

    const [result] = await findWorkspaceCreateDuplicates({
      userId: input.userId,
      steps: [
        {
          stepId,
          action: 'create_todo',
          target: 'todos',
          title: todoTitle,
          dueAt,
          timeText: typeof slots.timeText === 'string' ? slots.timeText : undefined,
        },
      ],
    })

    return result ? { ...result, source: 'precheck' as const } : null
  }

  if (target === 'notes') {
    const content = (cleanContent ??
      (typeof slots.content === 'string' ? slots.content : undefined) ??
      cleanTitle ??
      title ?? '').trim()
    if (!content) return null

    const [result] = await findWorkspaceCreateDuplicates({
      userId: input.userId,
      steps: [
        {
          stepId,
          action: 'create_note',
          target: 'notes',
          title,
          content,
        },
      ],
    })

    return result ? { ...result, source: 'precheck' as const } : null
  }

  return null
}

export async function findWorkspaceCreateDuplicateCandidates(input: {
  userId: string
  draftTasks: DraftWorkspaceTask[]
}): Promise<ReviewableDuplicateCandidate[]> {
  const dbCandidates = await Promise.all(
    input.draftTasks.map((draftTask, index) =>
      findWorkspaceCreateDuplicateCandidate({
        userId: input.userId,
        draftTask,
        stepId: `step_${index + 1}`,
      })
    )
  )

  const results = dbCandidates.filter(
    (result): result is ReviewableDuplicateCandidate => result !== null
  )
  const inBatchDuplicates = findInBatchCreateDuplicateCandidates(input.draftTasks)

  const seenStepIds = new Set(results.map((result) => result.stepId))
  for (const candidate of inBatchDuplicates) {
    if (!seenStepIds.has(candidate.stepId)) {
      results.push(candidate)
    }
  }

  return results
}
