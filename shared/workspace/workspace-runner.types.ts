import type { AssetListItem } from '@/shared/assets/assets.types'
import type {
  WorkspaceInteraction,
  WorkspaceInteractionResponse,
  WorkspacePendingRunSnapshot,
  WorkspaceRunError,
  WorkspaceRunPhase,
  WorkspaceRunPreview,
  WorkspaceRunRequest as WorkspaceRunProtocolRequest,
  WorkspaceRunResult,
  WorkspaceRunStreamEvent as WorkspaceRunProtocolEvent,
} from '@/shared/workspace/workspace-run-protocol'

export type WorkspaceRunRequest = WorkspaceRunProtocolRequest
export type {
  WorkspaceInteraction,
  WorkspaceInteractionResponse,
  WorkspacePendingRunSnapshot,
  WorkspaceRunError,
  WorkspaceRunPhase,
  WorkspaceRunPreview,
  WorkspaceRunResult,
}
// Canonical event type for all new interactive workspace-run code.
export type WorkspaceRunEvent = WorkspaceRunProtocolEvent
export type WorkspaceRunProtocolStreamEvent = WorkspaceRunEvent

// Legacy compatibility types for the old `/api/workspace/run` contract.
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
      kind: 'batch'
      summary: string
      stepResults: Array<{
        stepId: string
        toolName: string
        result: unknown
      }>
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

export type LegacyWorkspaceRunApiPhase = WorkspaceRunApiPhase
export type LegacyWorkspaceRunApiData = WorkspaceRunApiData
export type LegacyWorkspaceRunApiResponse = WorkspaceRunApiResponse
export type WorkspaceRunLegacyCompatibilityResult =
  | WorkspaceRunApiResponse
  | WorkspaceRunResult

// Legacy compatibility stream event for the old SSE client.
export type WorkspaceRunStreamEvent =
  | {
      type: 'phase'
      phase: WorkspaceRunApiPhase
    }
  | {
      type: 'result'
      response: WorkspaceRunApiResponse
    }
  | {
      type: 'error'
      message: string
    }

export type LegacyWorkspaceRunStreamEvent = WorkspaceRunStreamEvent
