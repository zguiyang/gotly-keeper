import type { WorkspaceAssetActionResult } from '@/shared/assets/assets.types'

export type WorkspaceRunRequest =
  | { kind: 'input'; text: string }
  | {
      kind: 'quick-action'
      action: 'review-todos' | 'summarize-notes' | 'summarize-bookmarks'
    }

type WorkspaceRunCreatedResult = Extract<
  WorkspaceAssetActionResult,
  { kind: 'created' }
> & {
  notice?: string | null
}

export type WorkspaceRunResult =
  | Exclude<WorkspaceAssetActionResult, { kind: 'created' }>
  | WorkspaceRunCreatedResult

export type WorkspaceRunStage =
  | 'understanding'
  | 'structuring'
  | 'executing'
  | 'finalizing'
