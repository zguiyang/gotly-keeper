import type {
  AssetListItem,
  BookmarkSummaryResult,
  NoteSummaryResult,
  TodoReviewResult,
  WorkspaceAssetActionResult,
} from '@/shared/assets/assets.types'

export type WorkspaceAgentTimeFilter =
  | { kind: 'none' }
  | {
      kind: 'exact_range'
      phrase: string
      startIso: string
      endIso: string
      basis: string
    }
  | {
      kind: 'vague'
      phrase: string
      reason: string
    }

export type WorkspaceAgentToolName =
  | 'create_workspace_asset'
  | 'search_workspace'
  | 'summarize_workspace'
  | 'get_workspace_capabilities'

export type WorkspaceAgentTraceEvent =
  | {
      type: 'input_normalized'
      title: '清理输入'
      rawInputPreview: string
      normalizedRequest: string
      removedNoise?: string[]
    }
  | {
      type: 'intent_identified'
      title: '识别意图'
      operation: 'create' | 'search' | 'summarize' | 'capabilities'
      assetType: 'note' | 'todo' | 'link' | 'mixed' | null
      publicReason: string
    }
  | {
      type: 'parameters_collected'
      title: '收集参数'
      parameters: Record<string, unknown>
    }
  | {
      type: 'time_resolved'
      title: '时间判断'
      phrase: string
      resolution: WorkspaceAgentTimeFilter
    }
  | {
      type: 'tool_selected'
      title: '选择工具'
      toolName: WorkspaceAgentToolName
      publicReason: string
    }
  | {
      type: 'tool_executed'
      title: '执行工具'
      toolName: WorkspaceAgentToolName
      publicArgs: Record<string, unknown>
      resultSummary: string
    }
  | {
      type: 'finalized'
      title: '整理结果'
      summary: string
    }

export type WorkspaceAgentStructuredResult =
  | (Extract<WorkspaceAssetActionResult, { kind: 'created' }> & {
      notice?: string | null
    })
  | {
      kind: 'query'
      query: string
      queryDescription: string
      results: AssetListItem[]
      timeFilter: WorkspaceAgentTimeFilter
    }
  | {
      kind: 'todo-review'
      review: TodoReviewResult
    }
  | {
      kind: 'note-summary'
      summary: NoteSummaryResult
    }
  | {
      kind: 'bookmark-summary'
      summary: BookmarkSummaryResult
    }
  | {
      kind: 'capabilities'
      items: string[]
    }

export type WorkspaceAgentToolOutput = {
  result: WorkspaceAgentStructuredResult
  trace: WorkspaceAgentTraceEvent[]
}

export type WorkspaceAgentRequest =
  | { kind: 'input'; text: string }
  | {
      kind: 'quick-action'
      action: 'review-todos' | 'summarize-notes' | 'summarize-bookmarks'
    }

export type WorkspaceRunRequest = WorkspaceAgentRequest
export type WorkspaceRunResult = WorkspaceAgentStructuredResult
