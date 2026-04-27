import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createWorkspaceAssetAction,
  loadWorkspaceAssetsPageAction,
  loadWorkspaceTodoDateMarkersAction,
  loadWorkspaceTodosByDateAction,
  reviewUnfinishedTodosAction,
  setTodoCompletionAction,
  summarizeRecentBookmarksAction,
  summarizeRecentNotesAction,
  updateWorkspaceAssetAction,
} from '@/app/workspace/actions'
import { ModuleActionError, MODULE_ACTION_ERROR_CODES } from '@/server/modules/actions/action-error'


const {
  revalidatePathMock,
  requireSignedInUserMock,
  executeModuleActionMock,
  createWorkspaceAssetMock,
  listWorkspaceAssetsPageMock,
  listWorkspaceTodoDateMarkersMock,
  listWorkspaceTodosByDateMock,
  setWorkspaceTodoCompletionMock,
  reviewWorkspaceUnfinishedTodosMock,
  summarizeWorkspaceRecentNotesMock,
  summarizeWorkspaceRecentBookmarksMock,
  updateWorkspaceNoteMock,
  updateWorkspaceTodoMock,
  updateWorkspaceBookmarkMock,
  WorkspaceModuleErrorMock,
  WORKSPACE_MODULE_ERROR_CODES_MOCK,
} = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
  requireSignedInUserMock: vi.fn(),
  executeModuleActionMock: vi.fn(),
  createWorkspaceAssetMock: vi.fn(),
  listWorkspaceAssetsPageMock: vi.fn(),
  listWorkspaceTodoDateMarkersMock: vi.fn(),
  listWorkspaceTodosByDateMock: vi.fn(),
  setWorkspaceTodoCompletionMock: vi.fn(),
  reviewWorkspaceUnfinishedTodosMock: vi.fn(),
  summarizeWorkspaceRecentNotesMock: vi.fn(),
  summarizeWorkspaceRecentBookmarksMock: vi.fn(),
  updateWorkspaceNoteMock: vi.fn(),
  updateWorkspaceTodoMock: vi.fn(),
  updateWorkspaceBookmarkMock: vi.fn(),
  WorkspaceModuleErrorMock: class WorkspaceModuleError extends Error {
    constructor(publicMessage: string, code = 'TODO_NOT_FOUND') {
      super(publicMessage)
      this.name = 'WorkspaceModuleError'
      ;(this as unknown as { publicMessage: string }).publicMessage = publicMessage
      ;(this as unknown as { code: string }).code = code
    }
  },
  WORKSPACE_MODULE_ERROR_CODES_MOCK: {
    TODO_NOT_FOUND: 'TODO_NOT_FOUND',
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
}))

vi.mock('@/server/modules/auth/session', () => ({
  requireSignedInUser: requireSignedInUserMock,
}))

vi.mock('@/server/modules/actions/run-server-action', () => ({
  executeModuleAction: executeModuleActionMock,
}))

vi.mock('@/server/modules/workspace', () => ({
  createWorkspaceAsset: createWorkspaceAssetMock,
  listWorkspaceAssetsPage: listWorkspaceAssetsPageMock,
  listWorkspaceTodoDateMarkers: listWorkspaceTodoDateMarkersMock,
  listWorkspaceTodosByDate: listWorkspaceTodosByDateMock,
  setWorkspaceTodoCompletion: setWorkspaceTodoCompletionMock,
  reviewWorkspaceUnfinishedTodos: reviewWorkspaceUnfinishedTodosMock,
  summarizeWorkspaceRecentNotes: summarizeWorkspaceRecentNotesMock,
  summarizeWorkspaceRecentBookmarks: summarizeWorkspaceRecentBookmarksMock,
  updateWorkspaceNote: updateWorkspaceNoteMock,
  updateWorkspaceTodo: updateWorkspaceTodoMock,
  updateWorkspaceBookmark: updateWorkspaceBookmarkMock,
  WorkspaceModuleError: WorkspaceModuleErrorMock,
  WORKSPACE_MODULE_ERROR_CODES: WORKSPACE_MODULE_ERROR_CODES_MOCK,
}))

describe('workspace server actions', () => {
  beforeEach(() => {
    revalidatePathMock.mockReset()
    requireSignedInUserMock.mockReset()
    executeModuleActionMock.mockReset()
    createWorkspaceAssetMock.mockReset()
    listWorkspaceAssetsPageMock.mockReset()
    listWorkspaceTodoDateMarkersMock.mockReset()
    listWorkspaceTodosByDateMock.mockReset()
    setWorkspaceTodoCompletionMock.mockReset()
    reviewWorkspaceUnfinishedTodosMock.mockReset()
    summarizeWorkspaceRecentNotesMock.mockReset()
    summarizeWorkspaceRecentBookmarksMock.mockReset()
    updateWorkspaceNoteMock.mockReset()
    updateWorkspaceTodoMock.mockReset()
    updateWorkspaceBookmarkMock.mockReset()

    requireSignedInUserMock.mockResolvedValue({ id: 'user_123' })
    executeModuleActionMock.mockImplementation(async (_action: string, handler: () => Promise<unknown>) => {
      return handler()
    })
  })

  it('createWorkspaceAssetAction trims input and revalidates workspace path', async () => {
    const expected = { kind: 'created', asset: { id: 'asset_1' } }
    createWorkspaceAssetMock.mockResolvedValue(expected)

    const result = await createWorkspaceAssetAction('  hello world  ')

    expect(result).toEqual(expected)
    expect(createWorkspaceAssetMock).toHaveBeenCalledWith({
      userId: 'user_123',
      text: 'hello world',
    })
    expect(revalidatePathMock).toHaveBeenCalledWith('/workspace')
  })

  it('createWorkspaceAssetAction rejects empty or non-string input', async () => {
    await expect(createWorkspaceAssetAction('   ')).rejects.toThrow('先输入一句内容。')
    await expect(createWorkspaceAssetAction({})).rejects.toThrow('先输入一句内容。')
    expect(createWorkspaceAssetMock).not.toHaveBeenCalled()
  })

  it('loadWorkspaceAssetsPageAction validates input and delegates to workspace pagination', async () => {
    const expected = {
      items: [{ id: 'note_1', type: 'note' }],
      pageInfo: { pageSize: 20, nextCursor: 'cursor_2', hasNextPage: true },
    }
    listWorkspaceAssetsPageMock.mockResolvedValue(expected)

    const result = await loadWorkspaceAssetsPageAction({
      type: 'note',
      lifecycleStatus: 'archived',
      pageSize: 20,
      cursor: 'cursor_1',
    })

    expect(result).toEqual(expected)
    expect(listWorkspaceAssetsPageMock).toHaveBeenCalledWith({
      userId: 'user_123',
      type: 'note',
      lifecycleStatus: 'archived',
      pageSize: 20,
      cursor: 'cursor_1',
    })
  })

  it('loadWorkspaceAssetsPageAction rejects invalid pagination input', async () => {
    await expect(loadWorkspaceAssetsPageAction({ type: 'invalid' })).rejects.toThrow(
      '资产参数错误，请重试。'
    )
    await expect(loadWorkspaceAssetsPageAction({ pageSize: 0 })).rejects.toThrow(
      '分页参数错误，请重试。'
    )
    await expect(loadWorkspaceAssetsPageAction({ lifecycleStatus: 'deleted' })).rejects.toThrow(
      '列表状态参数错误，请重试。'
    )
    expect(listWorkspaceAssetsPageMock).not.toHaveBeenCalled()
  })

  it('loadWorkspaceTodosByDateAction converts date key to day range', async () => {
    const expected = [{ id: 'todo_1', type: 'todo' }]
    listWorkspaceTodosByDateMock.mockResolvedValue(expected)

    const result = await loadWorkspaceTodosByDateAction({ date: '2026-04-23' })

    expect(result).toEqual(expected)
    expect(listWorkspaceTodosByDateMock).toHaveBeenCalledWith({
      userId: 'user_123',
      startsAt: new Date('2026-04-23T00:00:00+08:00'),
      endsAt: new Date('2026-04-24T00:00:00+08:00'),
    })
  })

  it('loadWorkspaceTodoDateMarkersAction validates range and delegates', async () => {
    const startsAt = new Date('2026-04-01T00:00:00.000Z')
    const endsAt = new Date('2026-05-01T00:00:00.000Z')
    listWorkspaceTodoDateMarkersMock.mockResolvedValue(['2026-04-23'])

    const result = await loadWorkspaceTodoDateMarkersAction({ startsAt, endsAt })

    expect(result).toEqual(['2026-04-23'])
    expect(listWorkspaceTodoDateMarkersMock).toHaveBeenCalledWith({
      userId: 'user_123',
      startsAt,
      endsAt,
    })
  })

  it('setTodoCompletionAction validates payload, trims assetId, and revalidates all paths', async () => {
    const expected = { id: 'todo_1', type: 'todo', originalText: 'task' }
    setWorkspaceTodoCompletionMock.mockResolvedValue(expected)

    const result = await setTodoCompletionAction({
      assetId: '  todo_1  ',
      completed: true,
    })

    expect(result).toEqual(expected)
    expect(setWorkspaceTodoCompletionMock).toHaveBeenCalledWith({
      userId: 'user_123',
      assetId: 'todo_1',
      completed: true,
    })
    expect(revalidatePathMock).toHaveBeenCalledWith('/workspace')
    expect(revalidatePathMock).toHaveBeenCalledWith('/workspace/all')
    expect(revalidatePathMock).toHaveBeenCalledWith('/workspace/todos')
  })

  it('setTodoCompletionAction rejects invalid payload', async () => {
    await expect(setTodoCompletionAction({})).rejects.toThrow('待办状态更新失败，请重试。')
    await expect(setTodoCompletionAction({ assetId: 'id', completed: 'yes' })).rejects.toThrow(
      '待办状态更新失败，请重试。'
    )
    expect(setWorkspaceTodoCompletionMock).not.toHaveBeenCalled()
  })

  it('setTodoCompletionAction maps WorkspaceModuleError(TODO_NOT_FOUND) to ModuleActionError(TODO_NOT_FOUND)', async () => {
    setWorkspaceTodoCompletionMock.mockRejectedValue(
      new WorkspaceModuleErrorMock(
        '没有找到这条待办，或你没有权限更新它。',
        WORKSPACE_MODULE_ERROR_CODES_MOCK.TODO_NOT_FOUND
      )
    )

    await expect(
      setTodoCompletionAction({ assetId: 'nonexistent', completed: true })
    ).rejects.toThrow(ModuleActionError)

    await expect(
      setTodoCompletionAction({ assetId: 'nonexistent', completed: true })
    ).rejects.toMatchObject({
      code: MODULE_ACTION_ERROR_CODES.TODO_NOT_FOUND,
      publicMessage: '没有找到这条待办，或你没有权限更新它。',
    })
  })

  it('summary actions delegate to use-cases with authenticated user', async () => {
    reviewWorkspaceUnfinishedTodosMock.mockResolvedValue({ text: 'todo review' })
    summarizeWorkspaceRecentNotesMock.mockResolvedValue({ text: 'note summary' })
    summarizeWorkspaceRecentBookmarksMock.mockResolvedValue({ text: 'bookmark summary' })

    await expect(reviewUnfinishedTodosAction()).resolves.toEqual({
      kind: 'todo-review',
      review: { text: 'todo review' },
    })
    await expect(summarizeRecentNotesAction()).resolves.toEqual({
      kind: 'note-summary',
      summary: { text: 'note summary' },
    })
    await expect(summarizeRecentBookmarksAction()).resolves.toEqual({
      kind: 'bookmark-summary',
      summary: { text: 'bookmark summary' },
    })

    expect(reviewWorkspaceUnfinishedTodosMock).toHaveBeenCalledWith({ userId: 'user_123' })
    expect(summarizeWorkspaceRecentNotesMock).toHaveBeenCalledWith({ userId: 'user_123' })
    expect(summarizeWorkspaceRecentBookmarksMock).toHaveBeenCalledWith({ userId: 'user_123' })
  })

  it('updateWorkspaceAssetAction forwards structured note payload', async () => {
    updateWorkspaceNoteMock.mockResolvedValue({ id: 'note_1', type: 'note' })

    await updateWorkspaceAssetAction({
      assetId: 'note_1',
      assetType: 'note',
      rawInput: '  需求评审\n\n补充边界条件  ',
      title: '  需求评审  ',
      content: '  补充边界条件  ',
    })

    expect(updateWorkspaceNoteMock).toHaveBeenCalledWith({
      userId: 'user_123',
      assetId: 'note_1',
      rawInput: '  需求评审\n\n补充边界条件  ',
      title: '需求评审',
      content: '  补充边界条件  ',
    })
  })

  it('updateWorkspaceAssetAction forwards structured todo payload', async () => {
    updateWorkspaceTodoMock.mockResolvedValue({ id: 'todo_1', type: 'todo' })

    const dueAt = new Date('2026-04-20T01:00:00.000Z')

    await updateWorkspaceAssetAction({
      assetId: 'todo_1',
      assetType: 'todo',
      rawInput: '  提交周报\n补充项目风险\n明天上午  ',
      title: '  提交周报  ',
      content: '  补充项目风险  ',
      timeText: '  明天上午  ',
      dueAt,
    })

    expect(updateWorkspaceTodoMock).toHaveBeenCalledWith({
      userId: 'user_123',
      assetId: 'todo_1',
      rawInput: '提交周报\n补充项目风险\n明天上午',
      title: '提交周报',
      content: '补充项目风险',
      timeText: '明天上午',
      dueAt,
    })
  })

  it('updateWorkspaceAssetAction forwards structured bookmark payload', async () => {
    updateWorkspaceBookmarkMock.mockResolvedValue({ id: 'bookmark_1', type: 'link' })

    await updateWorkspaceAssetAction({
      assetId: 'bookmark_1',
      assetType: 'link',
      rawInput: '  AI SDK 文档\n流式输出示例\nhttps://example.com  ',
      title: '  AI SDK 文档  ',
      note: '  流式输出示例  ',
      summary: '  收藏这篇是因为 SSE 示例很完整  ',
      url: '  https://example.com  ',
    })

    expect(updateWorkspaceBookmarkMock).toHaveBeenCalledWith({
      userId: 'user_123',
      assetId: 'bookmark_1',
      rawInput: 'AI SDK 文档\n流式输出示例\nhttps://example.com',
      title: 'AI SDK 文档',
      note: '流式输出示例',
      summary: '收藏这篇是因为 SSE 示例很完整',
      url: 'https://example.com',
    })
  })

  it('updateWorkspaceAssetAction does not overwrite note structured fields when content is omitted', async () => {
    updateWorkspaceNoteMock.mockResolvedValue({ id: 'note_1', type: 'note' })

    await updateWorkspaceAssetAction({
      assetId: 'note_1',
      assetType: 'note',
      rawInput: '保留原正文',
      title: '  只改标题  ',
    })

    expect(updateWorkspaceNoteMock).toHaveBeenCalledWith({
      userId: 'user_123',
      assetId: 'note_1',
      rawInput: '保留原正文',
      title: '只改标题',
      content: undefined,
    })
  })

  it('updateWorkspaceAssetAction does not overwrite bookmark note when note is omitted', async () => {
    updateWorkspaceBookmarkMock.mockResolvedValue({ id: 'bookmark_1', type: 'link' })

    await updateWorkspaceAssetAction({
      assetId: 'bookmark_1',
      assetType: 'link',
      rawInput: '保留原备注和原文',
      title: '  只改标题  ',
      url: ' https://example.com ',
    })

    expect(updateWorkspaceBookmarkMock).toHaveBeenCalledWith({
      userId: 'user_123',
      assetId: 'bookmark_1',
      rawInput: '保留原备注和原文',
      title: '只改标题',
      note: undefined,
      summary: undefined,
      url: 'https://example.com',
    })
  })
})
