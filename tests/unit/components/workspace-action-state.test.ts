import { describe, it, expect } from 'vitest'

import {
  createInitialWorkspaceActionState,
  toSubmitting,
  toError,
  toSuccess,
  applyWorkspaceActionResult,
  clearWorkspaceResultPanels,
  type WorkspaceActionState,
} from '../../../components/workspace/workspace-action-state'

import type {
  AssetListItem,
  AssetQueryResult,
  TodoReviewResult,
  NoteSummaryResult,
  BookmarkSummaryResult,
} from '../../../shared/assets/assets.types'

const mockAssetListItem: AssetListItem = {
  id: '1',
  originalText: 'Test asset',
  title: 'Test',
  excerpt: 'Test excerpt',
  type: 'note',
  url: null,
  timeText: null,
  dueAt: null,
  completed: false,
  createdAt: new Date(),
}

const mockQueryResult: AssetQueryResult = {
  query: 'test query',
  queryDescription: '书签 · 上周',
  results: [mockAssetListItem],
}

const mockTodoReview: TodoReviewResult = {
  headline: 'Test Headline',
  summary: 'Test Summary',
  nextActions: ['Action 1', 'Action 2'],
  sourceAssetIds: ['1'],
  sources: [{ id: '1', title: 'Test', timeText: null, dueAt: null }],
  generatedAt: new Date(),
}

const mockNoteSummary: NoteSummaryResult = {
  headline: 'Note Headline',
  summary: 'Note Summary',
  keyPoints: ['Point 1', 'Point 2'],
  sourceAssetIds: ['1'],
  sources: [{ id: '1', title: 'Test', createdAt: new Date() }],
  generatedAt: new Date(),
}

const mockBookmarkSummary: BookmarkSummaryResult = {
  headline: 'Bookmark Headline',
  summary: 'Bookmark Summary',
  keyPoints: ['Point 1'],
  sourceAssetIds: ['1'],
  sources: [{ id: '1', title: 'Test', url: 'https://example.com', createdAt: new Date() }],
  generatedAt: new Date(),
}

describe('workspace-action-state', () => {
  describe('createInitialWorkspaceActionState', () => {
    it('creates initial state with idle status and null values', () => {
      const state = createInitialWorkspaceActionState()

      expect(state.status).toBe('idle')
      expect(state.message).toBe(null)
      expect(state.queryResult).toBe(null)
      expect(state.todoReview).toBe(null)
      expect(state.noteSummary).toBe(null)
      expect(state.bookmarkSummary).toBe(null)
    })
  })

  describe('toSubmitting', () => {
    it('sets status to submitting and clears message', () => {
      const initialState: WorkspaceActionState = {
        status: 'idle',
        message: 'Some message',
        queryResult: mockQueryResult,
        todoReview: null,
        noteSummary: null,
        bookmarkSummary: null,
      }

      const newState = toSubmitting(initialState)

      expect(newState.status).toBe('submitting')
      expect(newState.message).toBe(null)
      expect(newState.queryResult).toBe(mockQueryResult)
    })

    it('clears message even if it was null', () => {
      const initialState = createInitialWorkspaceActionState()
      const newState = toSubmitting(initialState)

      expect(newState.status).toBe('submitting')
      expect(newState.message).toBe(null)
    })
  })

  describe('toError', () => {
    it('sets status to error with custom message', () => {
      const initialState = createInitialWorkspaceActionState()
      const newState = toError(initialState, 'Custom error message')

      expect(newState.status).toBe('error')
      expect(newState.message).toBe('Custom error message')
    })

    it('sets status to error with default message when no message provided', () => {
      const initialState = createInitialWorkspaceActionState()
      const newState = toError(initialState)

      expect(newState.status).toBe('error')
      expect(newState.message).toBe('处理失败，请重试。')
    })

    it('preserves other state fields', () => {
      const initialState: WorkspaceActionState = {
        status: 'submitting',
        message: null,
        queryResult: mockQueryResult,
        todoReview: mockTodoReview,
        noteSummary: null,
        bookmarkSummary: null,
      }

      const newState = toError(initialState, 'Error')

      expect(newState.status).toBe('error')
      expect(newState.queryResult).toBe(mockQueryResult)
      expect(newState.todoReview).toBe(mockTodoReview)
    })
  })

  describe('toSuccess', () => {
    it('sets status to success', () => {
      const initialState: WorkspaceActionState = {
        status: 'submitting',
        message: null,
        queryResult: null,
        todoReview: null,
        noteSummary: null,
        bookmarkSummary: null,
      }

      const newState = toSuccess(initialState)

      expect(newState.status).toBe('success')
    })
  })

  describe('applyWorkspaceActionResult', () => {
    it('clears all panels when result is created', () => {
      const initialState: WorkspaceActionState = {
        status: 'submitting',
        message: 'Old error',
        queryResult: mockQueryResult,
        todoReview: mockTodoReview,
        noteSummary: mockNoteSummary,
        bookmarkSummary: mockBookmarkSummary,
      }

      const result = { kind: 'created' as const, asset: mockAssetListItem }
      const newState = applyWorkspaceActionResult(initialState, result)

      expect(newState.status).toBe('success')
      expect(newState.message).toBe(null)
      expect(newState.queryResult).toBe(null)
      expect(newState.todoReview).toBe(null)
      expect(newState.noteSummary).toBe(null)
      expect(newState.bookmarkSummary).toBe(null)
    })

    it('sets query panel and clears others when result is query', () => {
      const initialState: WorkspaceActionState = {
        status: 'submitting',
        message: null,
        queryResult: null,
        todoReview: mockTodoReview,
        noteSummary: mockNoteSummary,
        bookmarkSummary: mockBookmarkSummary,
      }

      const result = {
        kind: 'query' as const,
        query: 'test query',
        queryDescription: '书签 · 上周',
        results: [mockAssetListItem],
      }
      const newState = applyWorkspaceActionResult(initialState, result)

      expect(newState.status).toBe('success')
      expect(newState.queryResult).toEqual(mockQueryResult)
      expect(newState.todoReview).toBe(null)
      expect(newState.noteSummary).toBe(null)
      expect(newState.bookmarkSummary).toBe(null)
    })

    it('sets todo-review panel and clears others when result is todo-review', () => {
      const initialState: WorkspaceActionState = {
        status: 'submitting',
        message: null,
        queryResult: mockQueryResult,
        todoReview: null,
        noteSummary: mockNoteSummary,
        bookmarkSummary: mockBookmarkSummary,
      }

      const result = { kind: 'todo-review' as const, review: mockTodoReview }
      const newState = applyWorkspaceActionResult(initialState, result)

      expect(newState.status).toBe('success')
      expect(newState.queryResult).toBe(null)
      expect(newState.todoReview).toEqual(mockTodoReview)
      expect(newState.noteSummary).toBe(null)
      expect(newState.bookmarkSummary).toBe(null)
    })

    it('sets note-summary panel and clears others when result is note-summary', () => {
      const initialState: WorkspaceActionState = {
        status: 'submitting',
        message: null,
        queryResult: mockQueryResult,
        todoReview: mockTodoReview,
        noteSummary: null,
        bookmarkSummary: mockBookmarkSummary,
      }

      const result = { kind: 'note-summary' as const, summary: mockNoteSummary }
      const newState = applyWorkspaceActionResult(initialState, result)

      expect(newState.status).toBe('success')
      expect(newState.queryResult).toBe(null)
      expect(newState.todoReview).toBe(null)
      expect(newState.noteSummary).toEqual(mockNoteSummary)
      expect(newState.bookmarkSummary).toBe(null)
    })

    it('sets bookmark-summary panel and clears others when result is bookmark-summary', () => {
      const initialState: WorkspaceActionState = {
        status: 'submitting',
        message: null,
        queryResult: mockQueryResult,
        todoReview: mockTodoReview,
        noteSummary: mockNoteSummary,
        bookmarkSummary: null,
      }

      const result = { kind: 'bookmark-summary' as const, summary: mockBookmarkSummary }
      const newState = applyWorkspaceActionResult(initialState, result)

      expect(newState.status).toBe('success')
      expect(newState.queryResult).toBe(null)
      expect(newState.todoReview).toBe(null)
      expect(newState.noteSummary).toBe(null)
      expect(newState.bookmarkSummary).toEqual(mockBookmarkSummary)
    })
  })

  describe('clearWorkspaceResultPanels', () => {
    it('clears all result panels', () => {
      const initialState: WorkspaceActionState = {
        status: 'success',
        message: 'Done',
        queryResult: mockQueryResult,
        todoReview: mockTodoReview,
        noteSummary: mockNoteSummary,
        bookmarkSummary: mockBookmarkSummary,
      }

      const newState = clearWorkspaceResultPanels(initialState)

      expect(newState.status).toBe('success')
      expect(newState.message).toBe('Done')
      expect(newState.queryResult).toBe(null)
      expect(newState.todoReview).toBe(null)
      expect(newState.noteSummary).toBe(null)
      expect(newState.bookmarkSummary).toBe(null)
    })
  })
})
