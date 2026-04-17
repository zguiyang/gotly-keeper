import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createWorkspaceAssetAction,
  reviewUnfinishedTodosAction,
  setTodoCompletionAction,
  summarizeRecentBookmarksAction,
  summarizeRecentNotesAction,
} from '@/app/workspace/actions'
import { ModuleActionError, MODULE_ACTION_ERROR_CODES } from '@/server/modules/actions/action-error'


const {
  revalidatePathMock,
  requireSignedInUserMock,
  executeModuleActionMock,
  createWorkspaceAssetMock,
  setWorkspaceTodoCompletionMock,
  reviewWorkspaceUnfinishedTodosMock,
  summarizeWorkspaceRecentNotesMock,
  summarizeWorkspaceRecentBookmarksMock,
  WorkspaceModuleErrorMock,
  WORKSPACE_MODULE_ERROR_CODES_MOCK,
} = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
  requireSignedInUserMock: vi.fn(),
  executeModuleActionMock: vi.fn(),
  createWorkspaceAssetMock: vi.fn(),
  setWorkspaceTodoCompletionMock: vi.fn(),
  reviewWorkspaceUnfinishedTodosMock: vi.fn(),
  summarizeWorkspaceRecentNotesMock: vi.fn(),
  summarizeWorkspaceRecentBookmarksMock: vi.fn(),
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
  setWorkspaceTodoCompletion: setWorkspaceTodoCompletionMock,
  reviewWorkspaceUnfinishedTodos: reviewWorkspaceUnfinishedTodosMock,
  summarizeWorkspaceRecentNotes: summarizeWorkspaceRecentNotesMock,
  summarizeWorkspaceRecentBookmarks: summarizeWorkspaceRecentBookmarksMock,
  WorkspaceModuleError: WorkspaceModuleErrorMock,
  WORKSPACE_MODULE_ERROR_CODES: WORKSPACE_MODULE_ERROR_CODES_MOCK,
}))

describe('workspace server actions', () => {
  beforeEach(() => {
    revalidatePathMock.mockReset()
    requireSignedInUserMock.mockReset()
    executeModuleActionMock.mockReset()
    createWorkspaceAssetMock.mockReset()
    setWorkspaceTodoCompletionMock.mockReset()
    reviewWorkspaceUnfinishedTodosMock.mockReset()
    summarizeWorkspaceRecentNotesMock.mockReset()
    summarizeWorkspaceRecentBookmarksMock.mockReset()

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
})
