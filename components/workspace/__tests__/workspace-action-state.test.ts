import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createInitialWorkspaceActionState,
  toSubmitting,
  toError,
  toSuccess,
  applyWorkspaceActionResult,
  clearWorkspaceResultPanels,
  type WorkspaceActionState,
} from '../workspace-action-state'
import type {
  AssetListItem,
  AssetQueryResult,
  TodoReviewResult,
  NoteSummaryResult,
  BookmarkSummaryResult,
} from '@/shared/assets/assets.types'

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

test('createInitialWorkspaceActionState creates initial state with idle status and null values', () => {
  const state = createInitialWorkspaceActionState()

  assert.equal(state.status, 'idle')
  assert.equal(state.message, null)
  assert.equal(state.queryResult, null)
  assert.equal(state.todoReview, null)
  assert.equal(state.noteSummary, null)
  assert.equal(state.bookmarkSummary, null)
})

test('toSubmitting sets status to submitting and clears message', () => {
  const initialState: WorkspaceActionState = {
    status: 'idle',
    message: 'Some message',
    queryResult: mockQueryResult,
    todoReview: null,
    noteSummary: null,
    bookmarkSummary: null,
  }

  const newState = toSubmitting(initialState)

  assert.equal(newState.status, 'submitting')
  assert.equal(newState.message, null)
  assert.equal(newState.queryResult, mockQueryResult)
})

test('toSubmitting clears message even if it was null', () => {
  const initialState = createInitialWorkspaceActionState()
  const newState = toSubmitting(initialState)

  assert.equal(newState.status, 'submitting')
  assert.equal(newState.message, null)
})

test('toError sets status to error with custom message', () => {
  const initialState = createInitialWorkspaceActionState()
  const newState = toError(initialState, 'Custom error message')

  assert.equal(newState.status, 'error')
  assert.equal(newState.message, 'Custom error message')
})

test('toError sets status to error with default message when no message provided', () => {
  const initialState = createInitialWorkspaceActionState()
  const newState = toError(initialState)

  assert.equal(newState.status, 'error')
  assert.equal(newState.message, '处理失败，请重试。')
})

test('toError preserves other state fields', () => {
  const initialState: WorkspaceActionState = {
    status: 'submitting',
    message: null,
    queryResult: mockQueryResult,
    todoReview: mockTodoReview,
    noteSummary: null,
    bookmarkSummary: null,
  }

  const newState = toError(initialState, 'Error')

  assert.equal(newState.status, 'error')
  assert.equal(newState.queryResult, mockQueryResult)
  assert.equal(newState.todoReview, mockTodoReview)
})

test('toSuccess sets status to success', () => {
  const initialState: WorkspaceActionState = {
    status: 'submitting',
    message: null,
    queryResult: null,
    todoReview: null,
    noteSummary: null,
    bookmarkSummary: null,
  }

  const newState = toSuccess(initialState)

  assert.equal(newState.status, 'success')
})

test('applyWorkspaceActionResult clears all panels when result is created', () => {
  const initialState: WorkspaceActionState = {
    status: 'submitting',
    message: null,
    queryResult: mockQueryResult,
    todoReview: mockTodoReview,
    noteSummary: mockNoteSummary,
    bookmarkSummary: mockBookmarkSummary,
  }

  const result = { kind: 'created' as const, asset: mockAssetListItem }
  const newState = applyWorkspaceActionResult(initialState, result)

  assert.equal(newState.status, 'success')
  assert.equal(newState.queryResult, null)
  assert.equal(newState.todoReview, null)
  assert.equal(newState.noteSummary, null)
  assert.equal(newState.bookmarkSummary, null)
})

test('applyWorkspaceActionResult sets query panel and clears others when result is query', () => {
  const initialState: WorkspaceActionState = {
    status: 'submitting',
    message: null,
    queryResult: null,
    todoReview: mockTodoReview,
    noteSummary: mockNoteSummary,
    bookmarkSummary: mockBookmarkSummary,
  }

  const result = { kind: 'query' as const, query: 'test query', results: [mockAssetListItem] }
  const newState = applyWorkspaceActionResult(initialState, result)

  assert.equal(newState.status, 'success')
  assert.deepEqual(newState.queryResult, mockQueryResult)
  assert.equal(newState.todoReview, null)
  assert.equal(newState.noteSummary, null)
  assert.equal(newState.bookmarkSummary, null)
})

test('applyWorkspaceActionResult sets todo-review panel and clears others when result is todo-review', () => {
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

  assert.equal(newState.status, 'success')
  assert.equal(newState.queryResult, null)
  assert.deepEqual(newState.todoReview, mockTodoReview)
  assert.equal(newState.noteSummary, null)
  assert.equal(newState.bookmarkSummary, null)
})

test('applyWorkspaceActionResult sets note-summary panel and clears others when result is note-summary', () => {
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

  assert.equal(newState.status, 'success')
  assert.equal(newState.queryResult, null)
  assert.equal(newState.todoReview, null)
  assert.deepEqual(newState.noteSummary, mockNoteSummary)
  assert.equal(newState.bookmarkSummary, null)
})

test('applyWorkspaceActionResult sets bookmark-summary panel and clears others when result is bookmark-summary', () => {
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

  assert.equal(newState.status, 'success')
  assert.equal(newState.queryResult, null)
  assert.equal(newState.todoReview, null)
  assert.equal(newState.noteSummary, null)
  assert.deepEqual(newState.bookmarkSummary, mockBookmarkSummary)
})

test('clearWorkspaceResultPanels clears all result panels', () => {
  const initialState: WorkspaceActionState = {
    status: 'success',
    message: 'Done',
    queryResult: mockQueryResult,
    todoReview: mockTodoReview,
    noteSummary: mockNoteSummary,
    bookmarkSummary: mockBookmarkSummary,
  }

  const newState = clearWorkspaceResultPanels(initialState)

  assert.equal(newState.status, 'success')
  assert.equal(newState.message, 'Done')
  assert.equal(newState.queryResult, null)
  assert.equal(newState.todoReview, null)
  assert.equal(newState.noteSummary, null)
  assert.equal(newState.bookmarkSummary, null)
})