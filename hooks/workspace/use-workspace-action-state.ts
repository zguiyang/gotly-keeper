import {
  type AssetQueryResult,
  type BookmarkSummaryResult,
  type NoteSummaryResult,
  type TodoReviewResult,
  type WorkspaceAssetActionResult,
} from '@/shared/assets/assets.types'

export type WorkspaceActionStatus = 'idle' | 'submitting' | 'success' | 'error'

export type WorkspaceActionMessage = string | null

export type WorkspaceActionState = {
  status: WorkspaceActionStatus
  message: WorkspaceActionMessage
  queryResult: AssetQueryResult | null
  todoReview: TodoReviewResult | null
  noteSummary: NoteSummaryResult | null
  bookmarkSummary: BookmarkSummaryResult | null
}

export function createInitialWorkspaceActionState(): WorkspaceActionState {
  return {
    status: 'idle',
    message: null,
    queryResult: null,
    todoReview: null,
    noteSummary: null,
    bookmarkSummary: null,
  }
}

export function toSubmitting(state: WorkspaceActionState): WorkspaceActionState {
  return {
    ...state,
    status: 'submitting',
    message: null,
  }
}

export function toError(state: WorkspaceActionState, message?: string): WorkspaceActionState {
  return {
    ...state,
    status: 'error',
    message: message ?? '处理失败，请重试。',
  }
}

export function toSuccess(state: WorkspaceActionState): WorkspaceActionState {
  return {
    ...state,
    status: 'success',
  }
}

export function applyWorkspaceActionResult(
  state: WorkspaceActionState,
  result: WorkspaceAssetActionResult
): WorkspaceActionState {
  const baseState: WorkspaceActionState = {
    ...state,
    status: 'success',
    message: null,
    queryResult: null,
    todoReview: null,
    noteSummary: null,
    bookmarkSummary: null,
  }

  switch (result.kind) {
    case 'created':
      return baseState

    case 'query':
      return {
        ...baseState,
        queryResult: {
          query: result.query,
          queryDescription: result.queryDescription,
          results: result.results,
        },
      }

    case 'todo-review':
      return {
        ...baseState,
        todoReview: result.review,
      }

    case 'note-summary':
      return {
        ...baseState,
        noteSummary: result.summary,
      }

    case 'bookmark-summary':
      return {
        ...baseState,
        bookmarkSummary: result.summary,
      }
  }
}

export function clearWorkspaceResultPanels(state: WorkspaceActionState): WorkspaceActionState {
  return {
    ...state,
    queryResult: null,
    todoReview: null,
    noteSummary: null,
    bookmarkSummary: null,
  }
}
