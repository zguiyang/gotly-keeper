import type { AssetListItem } from '@/shared/assets/assets.types'

export type WorkspaceRunRequest =
  | { kind: 'input'; text: string }
  | {
      kind: 'quick-action'
      action: 'review-todos' | 'summarize-notes' | 'summarize-bookmarks'
    }

export type WorkspaceRunApiPhase = {
  phase: 'parse' | 'route' | 'execute' | 'compose'
  status: 'active' | 'done' | 'failed' | 'skipped'
  message?: string
}

export type WorkspaceRunApiData =
  | {
      kind: 'query'
      target: 'notes' | 'todos' | 'bookmarks' | 'mixed'
      items: AssetListItem[]
      total: number
    }
  | {
      kind: 'mutation'
      action: 'create' | 'update'
      target: 'notes' | 'todos' | 'bookmarks'
      item: AssetListItem | null
    }
  | {
      kind: 'error'
      phase: 'parse_failed' | 'unsupported_task' | 'tool_failed' | 'compose_failed'
      message: string
    }

export type WorkspaceRunApiResponse = {
  ok: boolean
  phases: WorkspaceRunApiPhase[]
  answer: string | null
  data: WorkspaceRunApiData
}
