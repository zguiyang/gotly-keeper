import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BOOKMARK_META_STATUS } from '@/shared/assets/bookmark-meta.types'

const toolExecutionOptions = {} as never

const createNoteMock = vi.hoisted(() => vi.fn())
const createTodoMock = vi.hoisted(() => vi.fn())
const createBookmarkMock = vi.hoisted(() => vi.fn())
const searchAssetsMock = vi.hoisted(() => vi.fn())
const reviewWorkspaceUnfinishedTodosInternalMock = vi.hoisted(() => vi.fn())
const summarizeWorkspaceRecentNotesInternalMock = vi.hoisted(() => vi.fn())
const summarizeWorkspaceRecentBookmarksInternalMock = vi.hoisted(() => vi.fn())
const buildPendingBookmarkMetaForResponseMock = vi.hoisted(() => vi.fn())
const scheduleBookmarkEnrichTaskMock = vi.hoisted(() => vi.fn())

vi.mock('@/server/services/notes', () => ({
  createNote: createNoteMock,
}))

vi.mock('@/server/services/todos', () => ({
  createTodo: createTodoMock,
}))

vi.mock('@/server/services/bookmarks', () => ({
  createBookmark: createBookmarkMock,
}))

vi.mock('@/server/services/search/assets-search.service', () => ({
  searchAssets: searchAssetsMock,
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

import { toWorkspaceRunResult } from '@/server/modules/workspace/workspace-stream'
import { createWorkspaceTools } from '@/server/modules/workspace/workspace-tools'

function createDate(value: string) {
  return new Date(value)
}

function createPendingBookmarkMeta() {
  return {
    status: BOOKMARK_META_STATUS.PENDING,
    title: null,
    icon: null,
    bookmarkType: null,
    description: null,
    contentSummary: null,
    errorCode: null,
    errorMessage: null,
    updatedAt: '2026-04-19T00:00:00.000Z',
  }
}

describe('createWorkspaceTools', () => {
  beforeEach(() => {
    createNoteMock.mockReset()
    createTodoMock.mockReset()
    createBookmarkMock.mockReset()
    searchAssetsMock.mockReset()
    reviewWorkspaceUnfinishedTodosInternalMock.mockReset()
    summarizeWorkspaceRecentNotesInternalMock.mockReset()
    summarizeWorkspaceRecentBookmarksInternalMock.mockReset()
    buildPendingBookmarkMetaForResponseMock.mockReset()
    scheduleBookmarkEnrichTaskMock.mockReset()
    scheduleBookmarkEnrichTaskMock.mockResolvedValue(undefined)
    buildPendingBookmarkMetaForResponseMock.mockReturnValue(createPendingBookmarkMeta())
  })

  it('create_note keeps note side effect deterministic even when text looks like a link', async () => {
    createNoteMock.mockResolvedValue({
      id: 'note_1',
      originalText: 'https://example.com 这其实是一条笔记',
      title: '一条笔记',
      excerpt: '一条笔记',
      lifecycleStatus: 'active',
      archivedAt: null,
      trashedAt: null,
      createdAt: createDate('2026-04-19T00:00:00.000Z'),
      updatedAt: createDate('2026-04-19T00:00:00.000Z'),
    })

    const tools = createWorkspaceTools('user_1')
    const output = await tools.create_note.execute!(
      {
        rawInput: 'https://example.com 这其实是一条笔记',
        title: '一条笔记',
        content: 'https://example.com 这其实是一条笔记',
        summary: '这是笔记摘要',
      },
      toolExecutionOptions
    )

    expect(createNoteMock).toHaveBeenCalledWith({
      userId: 'user_1',
      rawInput: 'https://example.com 这其实是一条笔记',
      title: '一条笔记',
      content: 'https://example.com 这其实是一条笔记',
      summary: '这是笔记摘要',
    })
    expect(createTodoMock).not.toHaveBeenCalled()
    expect(createBookmarkMock).not.toHaveBeenCalled()
    expect(output).toMatchObject({
      kind: 'created',
      asset: {
        id: 'note_1',
        type: 'note',
        url: null,
      },
    })
  })

  it('create_todo keeps todo side effect deterministic even when text lacks todo keywords', async () => {
    createTodoMock.mockResolvedValue({
      id: 'todo_1',
      originalText: '普通一句话',
      title: '普通一句话',
      excerpt: '普通一句话',
      timeText: null,
      dueAt: null,
      completed: false,
      lifecycleStatus: 'active',
      archivedAt: null,
      trashedAt: null,
      createdAt: createDate('2026-04-19T00:00:00.000Z'),
      updatedAt: createDate('2026-04-19T00:00:00.000Z'),
    })

    const tools = createWorkspaceTools('user_1')
    const output = await tools.create_todo.execute!(
      {
        rawInput: '普通一句话',
        title: '普通一句话',
        content: '补充说明',
        timeText: '明天上午',
        dueAtIso: '2026-04-20T09:00:00.000Z',
      },
      toolExecutionOptions
    )

    expect(createTodoMock).toHaveBeenCalledWith({
      userId: 'user_1',
      rawInput: '普通一句话',
      title: '普通一句话',
      content: '补充说明',
      timeText: '明天上午',
      dueAt: createDate('2026-04-20T09:00:00.000Z'),
    })
    expect(createNoteMock).not.toHaveBeenCalled()
    expect(createBookmarkMock).not.toHaveBeenCalled()
    expect(output).toMatchObject({
      kind: 'created',
      asset: {
        id: 'todo_1',
        type: 'todo',
        completed: false,
      },
    })
  })

  it('create_link keeps link side effect deterministic without relying on text classification', async () => {
    createBookmarkMock.mockResolvedValue({
      id: 'bookmark_1',
      originalText: '保存这个链接',
      title: '示例页面',
      excerpt: '示例页面摘要',
      url: 'https://example.com',
      bookmarkMeta: null,
      lifecycleStatus: 'active',
      archivedAt: null,
      trashedAt: null,
      createdAt: createDate('2026-04-19T00:00:00.000Z'),
      updatedAt: createDate('2026-04-19T00:00:00.000Z'),
    })

    const tools = createWorkspaceTools('user_1')
    const output = await tools.create_link.execute!(
      {
        rawInput: '保存这个链接',
        url: 'https://example.com',
        title: '示例页面',
        note: '这是一条备注',
        summary: '这是摘要',
      },
      toolExecutionOptions
    )

    expect(createBookmarkMock).toHaveBeenCalledWith({
      userId: 'user_1',
      rawInput: '保存这个链接',
      url: 'https://example.com',
      title: '示例页面',
      note: '这是一条备注',
      summary: '这是摘要',
    })
    expect(createNoteMock).not.toHaveBeenCalled()
    expect(createTodoMock).not.toHaveBeenCalled()
    expect(scheduleBookmarkEnrichTaskMock).toHaveBeenCalledWith({
      bookmarkId: 'bookmark_1',
      userId: 'user_1',
      url: 'https://example.com',
    })
    expect(output).toMatchObject({
      kind: 'created',
      asset: {
        id: 'bookmark_1',
        type: 'link',
        url: 'https://example.com',
        bookmarkMeta: createPendingBookmarkMeta(),
      },
    })
  })

  it('search_assets tool delegates to searchWorkspaceAssets', async () => {
    const results = [{ id: 'asset_1' }]
    searchAssetsMock.mockResolvedValue(results)

    const tools = createWorkspaceTools('user_1')
    const output = await tools.search_assets.execute!(
      {
        query: 'landing page',
        typeHint: 'link',
        timeHint: '上周',
        completionHint: 'incomplete',
      },
      toolExecutionOptions
    )

    expect(searchAssetsMock).toHaveBeenCalledWith({
      userId: 'user_1',
      query: 'landing page',
      typeHint: 'link',
      timeHint: '上周',
      completionHint: 'incomplete',
    })
    expect(output).toEqual({
      kind: 'query',
      query: 'landing page',
      results,
    })
  })

  it('summarize_workspace tool delegates by target', async () => {
    const todoReview = { headline: '待办复盘' }
    const noteSummary = { headline: '笔记摘要' }
    const bookmarkSummary = { headline: '书签摘要' }

    reviewWorkspaceUnfinishedTodosInternalMock.mockResolvedValue(todoReview)
    summarizeWorkspaceRecentNotesInternalMock.mockResolvedValue(noteSummary)
    summarizeWorkspaceRecentBookmarksInternalMock.mockResolvedValue(bookmarkSummary)

    const tools = createWorkspaceTools('user_1')

    await expect(
      tools.summarize_workspace.execute!(
        { target: 'todos', query: '最近要处理的事情' },
        toolExecutionOptions
      )
    ).resolves.toEqual({ kind: 'todo-review', review: todoReview })
    await expect(
      tools.summarize_workspace.execute!(
        { target: 'notes', query: '最近产品想法' },
        toolExecutionOptions
      )
    ).resolves.toEqual({ kind: 'note-summary', summary: noteSummary })
    await expect(
      tools.summarize_workspace.execute!(
        { target: 'bookmarks', query: '最近收藏的文章' },
        toolExecutionOptions
      )
    ).resolves.toEqual({ kind: 'bookmark-summary', summary: bookmarkSummary })

    expect(reviewWorkspaceUnfinishedTodosInternalMock).toHaveBeenCalledWith(
      'user_1',
      '最近要处理的事情'
    )
    expect(summarizeWorkspaceRecentNotesInternalMock).toHaveBeenCalledWith(
      'user_1',
      '最近产品想法'
    )
    expect(summarizeWorkspaceRecentBookmarksInternalMock).toHaveBeenCalledWith(
      'user_1',
      '最近收藏的文章'
    )
  })

  it('summarize_workspace preserves null query for fixed summary commands', async () => {
    reviewWorkspaceUnfinishedTodosInternalMock.mockResolvedValue({ headline: '待办复盘' })
    summarizeWorkspaceRecentNotesInternalMock.mockResolvedValue({ headline: '笔记摘要' })
    summarizeWorkspaceRecentBookmarksInternalMock.mockResolvedValue({ headline: '书签摘要' })

    const tools = createWorkspaceTools('user_1')

    await tools.summarize_workspace.execute!({ target: 'todos', query: null }, toolExecutionOptions)
    await tools.summarize_workspace.execute!({ target: 'notes', query: null }, toolExecutionOptions)
    await tools.summarize_workspace.execute!(
      { target: 'bookmarks', query: null },
      toolExecutionOptions
    )

    expect(reviewWorkspaceUnfinishedTodosInternalMock).toHaveBeenLastCalledWith('user_1', null)
    expect(summarizeWorkspaceRecentNotesInternalMock).toHaveBeenLastCalledWith('user_1', null)
    expect(summarizeWorkspaceRecentBookmarksInternalMock).toHaveBeenLastCalledWith('user_1', null)
  })
})

describe('toWorkspaceRunResult', () => {
  it('adds enrich notice for created link results', () => {
    const result = toWorkspaceRunResult({
      kind: 'created',
      asset: {
        id: 'bookmark_1',
        originalText: '保存这个链接',
        title: '示例页面',
        excerpt: '示例页面摘要',
        type: 'link',
        url: 'https://example.com',
        timeText: null,
        dueAt: null,
        completed: false,
        bookmarkMeta: createPendingBookmarkMeta(),
        createdAt: createDate('2026-04-19T00:00:00.000Z'),
      },
    })

    expect(result).toMatchObject({
      kind: 'created',
      notice: '已保存书签，页面信息会稍后补全。',
      asset: {
        id: 'bookmark_1',
        type: 'link',
      },
    })
  })

  it('keeps non-link results unchanged', () => {
    const createdNoteResult = {
      kind: 'created' as const,
      asset: {
        id: 'note_1',
        originalText: '记录一条笔记',
        title: '记录一条笔记',
        excerpt: '记录一条笔记',
        type: 'note' as const,
        url: null,
        timeText: null,
        dueAt: null,
        completed: false,
        createdAt: createDate('2026-04-19T00:00:00.000Z'),
      },
    }
    const queryResult = {
      kind: 'query' as const,
      query: 'landing page',
      results: [],
    }

    expect(toWorkspaceRunResult(createdNoteResult)).toBe(createdNoteResult)
    expect(toWorkspaceRunResult(queryResult)).toBe(queryResult)
  })
})
