import 'server-only'

import { findWorkspaceCreateDuplicates } from '@/server/services/workspace/workspace-assets.service'

import type { DraftWorkspaceTask, WorkspaceCandidate } from '@/shared/workspace/workspace-run-protocol'

export type ReviewableDuplicateCandidate = {
  stepId: string
  target: 'todo' | 'note' | 'bookmark'
  source?: 'bookmark_precheck'
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
  const bookmarkCandidates = await Promise.all(
    input.draftTasks.map((draftTask, index) =>
      findWorkspaceBookmarkDuplicateCandidate({
        userId: input.userId,
        draftTask,
        stepId: `step_${index + 1}`,
      })
    )
  )

  const results = bookmarkCandidates.filter(
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
