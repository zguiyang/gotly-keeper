import 'server-only'

import { findWorkspaceCreateDuplicates } from '@/server/services/workspace/workspace-assets.service'

import type { DraftWorkspaceTask, WorkspaceCandidate } from '@/shared/workspace/workspace-run-protocol'

export type ReviewableDuplicateCandidate = {
  stepId: string
  target: 'todo' | 'note' | 'bookmark'
  source?: 'bookmark_precheck'
  duplicates: WorkspaceCandidate[]
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
