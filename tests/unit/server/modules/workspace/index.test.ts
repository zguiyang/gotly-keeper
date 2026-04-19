import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createWorkspaceLink,
  createWorkspaceNote,
  createWorkspaceTodo,
  buildQuickActionWorkspaceCommand,
  executeWorkspaceCommand,
  runWorkspaceCommand,
} from '@/server/modules/workspace'

const parseWorkspaceCommandMock = vi.hoisted(() => vi.fn())
const createNoteMock = vi.hoisted(() => vi.fn())
const createTodoMock = vi.hoisted(() => vi.fn())
const createBookmarkMock = vi.hoisted(() => vi.fn())
const searchAssetsMock = vi.hoisted(() => vi.fn())
const reviewWorkspaceUnfinishedTodosInternalMock = vi.hoisted(() => vi.fn())
const summarizeWorkspaceRecentNotesInternalMock = vi.hoisted(() => vi.fn())
const summarizeWorkspaceRecentBookmarksInternalMock = vi.hoisted(() => vi.fn())
const buildPendingBookmarkMetaForResponseMock = vi.hoisted(() => vi.fn())
const scheduleBookmarkEnrichTaskMock = vi.hoisted(() => vi.fn())

vi.mock('@/server/lib/ai/workspace-parser', () => ({
  parseWorkspaceCommand: parseWorkspaceCommandMock,
}))

vi.mock('@/server/services/notes', () => ({
  createNote: createNoteMock,
  getNoteById: vi.fn(),
  listNotes: vi.fn(),
  moveNoteToTrash: vi.fn(),
  purgeNote: vi.fn(),
  restoreNoteFromTrash: vi.fn(),
  unarchiveNote: vi.fn(),
  updateNote: vi.fn(),
  archiveNote: vi.fn(),
}))

vi.mock('@/server/services/todos', () => ({
  createTodo: createTodoMock,
  getTodoById: vi.fn(),
  listTodos: vi.fn(),
  moveTodoToTrash: vi.fn(),
  purgeTodo: vi.fn(),
  restoreTodoFromTrash: vi.fn(),
  setTodoCompletion: vi.fn(),
  unarchiveTodo: vi.fn(),
  updateTodo: vi.fn(),
  archiveTodo: vi.fn(),
}))

vi.mock('@/server/services/bookmarks', () => ({
  createBookmark: createBookmarkMock,
  getBookmarkById: vi.fn(),
  listBookmarks: vi.fn(),
  moveBookmarkToTrash: vi.fn(),
  purgeBookmark: vi.fn(),
  restoreBookmarkFromTrash: vi.fn(),
  unarchiveBookmark: vi.fn(),
  updateBookmark: vi.fn(),
  archiveBookmark: vi.fn(),
}))

vi.mock('@/server/services/search/assets-search.service', () => ({
  searchAssets: searchAssetsMock,
}))

vi.mock('@/server/services/search/semantic-search.service', () => ({
  deleteEmbeddingsForAsset: vi.fn(),
}))

vi.mock('@/server/modules/workspace/todos.review', () => ({
  reviewWorkspaceUnfinishedTodosInternal: reviewWorkspaceUnfinishedTodosInternalMock,
}))

vi.mock('@/server/modules/workspace/notes.summary', () => ({
  summarizeWorkspaceRecentNotesInternal: summarizeWorkspaceRecentNotesInternalMock,
}))

vi.mock('@/server/modules/workspace/bookmarks.summary', () => ({
  summarizeWorkspaceRecentBookmarksInternal: summarizeWorkspaceRecentBookmarksInternalMock,
}))

vi.mock('@/server/modules/workspace/bookmark-enrich.module', () => ({
  buildPendingBookmarkMetaForResponse: buildPendingBookmarkMetaForResponseMock,
  scheduleBookmarkEnrichTask: scheduleBookmarkEnrichTaskMock,
}))

vi.mock('@/server/services/assets/asset-lifecycle', () => ({
  canArchive: vi.fn(),
  canMoveToTrash: vi.fn(),
  canPurge: vi.fn(),
  canRestoreFromTrash: vi.fn(),
  canUnarchive: vi.fn(),
}))

describe('runWorkspaceCommand', () => {
  beforeEach(() => {
    parseWorkspaceCommandMock.mockReset()
    createNoteMock.mockReset()
    createTodoMock.mockReset()
    createBookmarkMock.mockReset()
    searchAssetsMock.mockReset()
    reviewWorkspaceUnfinishedTodosInternalMock.mockReset()
    summarizeWorkspaceRecentNotesInternalMock.mockReset()
    summarizeWorkspaceRecentBookmarksInternalMock.mockReset()
    buildPendingBookmarkMetaForResponseMock.mockReset()
    scheduleBookmarkEnrichTaskMock.mockReset()
    buildPendingBookmarkMetaForResponseMock.mockReturnValue(null)
    scheduleBookmarkEnrichTaskMock.mockResolvedValue(undefined)
  })

  it('executes parsed structured search payload before any heuristic classification', async () => {
    parseWorkspaceCommandMock.mockResolvedValue({
      confidence: 0.95,
      originalText: '帮我找上周收藏的文章',
      rawInput: '帮我找上周收藏的文章',
      intent: 'search',
      operation: 'search_assets',
      assetType: null,
      todo: null,
      note: null,
      bookmark: null,
      search: {
        query: '文章',
        typeHint: 'link',
        timeHint: '上周',
        completionHint: null,
      },
      summary: null,
    })
    searchAssetsMock.mockResolvedValue([{ id: 'asset_1' }])

    const result = await runWorkspaceCommand({
      userId: 'user_1',
      text: '帮我找上周收藏的文章',
    })

    expect(searchAssetsMock).toHaveBeenCalledWith({
      userId: 'user_1',
      query: '文章',
      typeHint: 'link',
      timeHint: '上周',
      completionHint: null,
    })
    expect(createNoteMock).not.toHaveBeenCalled()
    expect(result).toEqual({
      command: expect.objectContaining({ operation: 'search_assets' }),
      result: {
        kind: 'query',
        query: '文章',
        queryDescription: '书签 · 上周',
        results: [{ id: 'asset_1' }],
      },
    })
  })

  it('uses legacy heuristic fallback only when parser throws', async () => {
    parseWorkspaceCommandMock.mockRejectedValue(new Error('parser failed'))
    createBookmarkMock.mockResolvedValue({
      id: 'bookmark_1',
      originalText: '存一下这个链接 https://example.com',
      title: '示例页面',
      excerpt: '示例页面摘要',
      url: 'https://example.com',
      bookmarkMeta: null,
      lifecycleStatus: 'active',
      archivedAt: null,
      trashedAt: null,
      createdAt: new Date('2026-04-19T00:00:00.000Z'),
      updatedAt: new Date('2026-04-19T00:00:00.000Z'),
    })

    const result = await runWorkspaceCommand({
      userId: 'user_1',
      text: '存一下这个链接 https://example.com',
    })

    expect(createBookmarkMock).toHaveBeenCalledWith({
      userId: 'user_1',
      rawInput: '存一下这个链接 https://example.com',
      url: 'https://example.com',
      title: null,
      note: null,
      summary: null,
    })
    expect(result.command.operation).toBe('create_link')
    expect(result.result.kind).toBe('created')
  })

  it('maps review-todos quick action to fixed summary command with null query', async () => {
    reviewWorkspaceUnfinishedTodosInternalMock.mockResolvedValue({ headline: '待办复盘' })

    const command = buildQuickActionWorkspaceCommand('review-todos')
    const result = await executeWorkspaceCommand({ userId: 'user_1', command })

    expect(command.summary).toEqual({ target: 'todos', query: null })
    expect(reviewWorkspaceUnfinishedTodosInternalMock).toHaveBeenCalledWith('user_1', null)
    expect(result).toEqual({ kind: 'todo-review', review: { headline: '待办复盘' } })
  })

  it('maps summarize-notes quick action to fixed summary command with null query', async () => {
    summarizeWorkspaceRecentNotesInternalMock.mockResolvedValue({ headline: '笔记摘要' })

    const command = buildQuickActionWorkspaceCommand('summarize-notes')
    const result = await executeWorkspaceCommand({ userId: 'user_1', command })

    expect(command.summary).toEqual({ target: 'notes', query: null })
    expect(summarizeWorkspaceRecentNotesInternalMock).toHaveBeenCalledWith('user_1', null)
    expect(result).toEqual({ kind: 'note-summary', summary: { headline: '笔记摘要' } })
  })

  it('maps summarize-bookmarks quick action to fixed summary command with null query', async () => {
    summarizeWorkspaceRecentBookmarksInternalMock.mockResolvedValue({ headline: '书签摘要' })

    const command = buildQuickActionWorkspaceCommand('summarize-bookmarks')
    const result = await executeWorkspaceCommand({ userId: 'user_1', command })

    expect(command.summary).toEqual({ target: 'bookmarks', query: null })
    expect(summarizeWorkspaceRecentBookmarksInternalMock).toHaveBeenCalledWith('user_1', null)
    expect(result).toEqual({ kind: 'bookmark-summary', summary: { headline: '书签摘要' } })
  })

  it('returns structured note fields in created asset payload', async () => {
    createNoteMock.mockResolvedValue({
      id: 'note_1',
      originalText: '需求评审\n\n补充边界条件',
      title: '需求评审',
      content: '补充边界条件',
      summary: '补充边界条件',
      excerpt: '补充边界条件',
      lifecycleStatus: 'active',
      archivedAt: null,
      trashedAt: null,
      createdAt: new Date('2026-04-19T00:00:00.000Z'),
      updatedAt: new Date('2026-04-19T00:00:00.000Z'),
    })

    await expect(
      createWorkspaceNote({
        userId: 'user_1',
        rawInput: '需求评审\n\n补充边界条件',
        title: '需求评审',
        content: '补充边界条件',
        summary: '补充边界条件',
      })
    ).resolves.toMatchObject({
      kind: 'created',
      asset: {
        type: 'note',
        title: '需求评审',
        content: '补充边界条件',
        summary: '补充边界条件',
      },
    })
  })

  it('returns structured todo fields in created asset payload', async () => {
    createTodoMock.mockResolvedValue({
      id: 'todo_1',
      originalText: '提交周报\n补充项目风险\n明天上午',
      title: '提交周报',
      content: '补充项目风险',
      excerpt: '补充项目风险',
      timeText: '明天上午',
      dueAt: null,
      completed: false,
      completedAt: null,
      lifecycleStatus: 'active',
      archivedAt: null,
      trashedAt: null,
      createdAt: new Date('2026-04-19T00:00:00.000Z'),
      updatedAt: new Date('2026-04-19T00:00:00.000Z'),
    })

    await expect(
      createWorkspaceTodo({
        userId: 'user_1',
        rawInput: '提交周报\n补充项目风险\n明天上午',
        title: '提交周报',
        content: '补充项目风险',
        timeText: '明天上午',
        dueAt: null,
      })
    ).resolves.toMatchObject({
      kind: 'created',
      asset: {
        type: 'todo',
        title: '提交周报',
        content: '补充项目风险',
      },
    })
  })

  it('returns structured bookmark fields in created asset payload', async () => {
    createBookmarkMock.mockResolvedValue({
      id: 'bookmark_1',
      originalText: 'AI SDK 文档\n流式输出示例\nhttps://example.com',
      title: 'AI SDK 文档',
      note: '流式输出示例',
      summary: '流式输出示例',
      excerpt: '流式输出示例',
      url: 'https://example.com',
      bookmarkMeta: null,
      lifecycleStatus: 'active',
      archivedAt: null,
      trashedAt: null,
      createdAt: new Date('2026-04-19T00:00:00.000Z'),
      updatedAt: new Date('2026-04-19T00:00:00.000Z'),
    })

    await expect(
      createWorkspaceLink({
        userId: 'user_1',
        rawInput: 'AI SDK 文档\n流式输出示例\nhttps://example.com',
        title: 'AI SDK 文档',
        note: '流式输出示例',
        summary: '流式输出示例',
        url: 'https://example.com',
      })
    ).resolves.toMatchObject({
      kind: 'created',
      asset: {
        type: 'link',
        title: 'AI SDK 文档',
        note: '流式输出示例',
        summary: '流式输出示例',
      },
    })
  })
})
