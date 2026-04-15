import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  revalidatePathMock,
  requireUserMock,
  runServerActionMock,
  createWorkspaceAssetUseCaseMock,
  setTodoCompletionUseCaseMock,
  reviewUnfinishedTodosUseCaseMock,
  summarizeRecentNotesUseCaseMock,
  summarizeRecentBookmarksUseCaseMock,
} = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
  requireUserMock: vi.fn(),
  runServerActionMock: vi.fn(),
  createWorkspaceAssetUseCaseMock: vi.fn(),
  setTodoCompletionUseCaseMock: vi.fn(),
  reviewUnfinishedTodosUseCaseMock: vi.fn(),
  summarizeRecentNotesUseCaseMock: vi.fn(),
  summarizeRecentBookmarksUseCaseMock: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
}))

vi.mock('@/server/auth/session', () => ({
  requireUser: requireUserMock,
}))

vi.mock('@/server/actions/run-server-action', () => ({
  runServerAction: runServerActionMock,
}))

vi.mock('@/server/application/workspace', () => ({
  createWorkspaceAssetUseCase: createWorkspaceAssetUseCaseMock,
  setTodoCompletionUseCase: setTodoCompletionUseCaseMock,
  reviewUnfinishedTodosUseCase: reviewUnfinishedTodosUseCaseMock,
  summarizeRecentNotesUseCase: summarizeRecentNotesUseCaseMock,
  summarizeRecentBookmarksUseCase: summarizeRecentBookmarksUseCaseMock,
}))

import {
  createWorkspaceAssetAction,
  reviewUnfinishedTodosAction,
  setTodoCompletionAction,
  summarizeRecentBookmarksAction,
  summarizeRecentNotesAction,
} from '@/app/workspace/actions'

describe('workspace server actions', () => {
  beforeEach(() => {
    revalidatePathMock.mockReset()
    requireUserMock.mockReset()
    runServerActionMock.mockReset()
    createWorkspaceAssetUseCaseMock.mockReset()
    setTodoCompletionUseCaseMock.mockReset()
    reviewUnfinishedTodosUseCaseMock.mockReset()
    summarizeRecentNotesUseCaseMock.mockReset()
    summarizeRecentBookmarksUseCaseMock.mockReset()

    requireUserMock.mockResolvedValue({ id: 'user_123' })
    runServerActionMock.mockImplementation(async (_action: string, handler: () => Promise<unknown>) => {
      return handler()
    })
  })

  it('createWorkspaceAssetAction trims input and revalidates workspace path', async () => {
    const expected = { kind: 'created', asset: { id: 'asset_1' } }
    createWorkspaceAssetUseCaseMock.mockResolvedValue(expected)

    const result = await createWorkspaceAssetAction('  hello world  ')

    expect(result).toEqual(expected)
    expect(createWorkspaceAssetUseCaseMock).toHaveBeenCalledWith({
      userId: 'user_123',
      text: 'hello world',
    })
    expect(revalidatePathMock).toHaveBeenCalledWith('/workspace')
  })

  it('createWorkspaceAssetAction rejects empty or non-string input', async () => {
    await expect(createWorkspaceAssetAction('   ')).rejects.toThrow('先输入一句内容。')
    await expect(createWorkspaceAssetAction({})).rejects.toThrow('先输入一句内容。')
    expect(createWorkspaceAssetUseCaseMock).not.toHaveBeenCalled()
  })

  it('setTodoCompletionAction validates payload, trims assetId, and revalidates all paths', async () => {
    const expected = { id: 'todo_1', type: 'todo', originalText: 'task' }
    setTodoCompletionUseCaseMock.mockResolvedValue(expected)

    const result = await setTodoCompletionAction({
      assetId: '  todo_1  ',
      completed: true,
    })

    expect(result).toEqual(expected)
    expect(setTodoCompletionUseCaseMock).toHaveBeenCalledWith({
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
    expect(setTodoCompletionUseCaseMock).not.toHaveBeenCalled()
  })

  it('summary actions delegate to use-cases with authenticated user', async () => {
    reviewUnfinishedTodosUseCaseMock.mockResolvedValue({ text: 'todo review' })
    summarizeRecentNotesUseCaseMock.mockResolvedValue({ text: 'note summary' })
    summarizeRecentBookmarksUseCaseMock.mockResolvedValue({ text: 'bookmark summary' })

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

    expect(reviewUnfinishedTodosUseCaseMock).toHaveBeenCalledWith({ userId: 'user_123' })
    expect(summarizeRecentNotesUseCaseMock).toHaveBeenCalledWith({ userId: 'user_123' })
    expect(summarizeRecentBookmarksUseCaseMock).toHaveBeenCalledWith({ userId: 'user_123' })
  })
})
