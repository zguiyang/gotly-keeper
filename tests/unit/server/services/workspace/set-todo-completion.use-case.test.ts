import { describe, it, expect, vi, beforeEach } from 'vitest'

const setTodoCompletionMock = vi.hoisted(() => vi.fn())

vi.mock('@/server/services/assets/assets.service', () => ({
  setTodoCompletion: setTodoCompletionMock,
}))

import { setTodoCompletionUseCase } from '@/server/services/workspace/set-todo-completion.use-case'
import { WorkspaceApplicationError, WORKSPACE_APPLICATION_ERROR_CODES } from '@/server/services/workspace/workspace.application-error'

describe('setTodoCompletionUseCase', () => {
  beforeEach(() => {
    setTodoCompletionMock.mockReset()
  })

  it('returns updated asset when setTodoCompletion succeeds', async () => {
    const mockAsset = {
      id: 'asset_1',
      originalText: 'task',
      title: 'task',
      excerpt: 'task',
      type: 'todo' as const,
      url: null,
      timeText: null,
      dueAt: null,
      completed: true,
      createdAt: new Date(),
    }
    setTodoCompletionMock.mockResolvedValue(mockAsset)

    const result = await setTodoCompletionUseCase({
      userId: 'user_123',
      assetId: 'asset_1',
      completed: true,
    })

    expect(result).toEqual(mockAsset)
    expect(setTodoCompletionMock).toHaveBeenCalledWith({
      userId: 'user_123',
      assetId: 'asset_1',
      completed: true,
    })
  })

  it('throws WorkspaceApplicationError(TODO_NOT_FOUND) when setTodoCompletion returns null', async () => {
    setTodoCompletionMock.mockResolvedValue(null)

    await expect(
      setTodoCompletionUseCase({
        userId: 'user_123',
        assetId: 'nonexistent',
        completed: true,
      })
    ).rejects.toThrow(WorkspaceApplicationError)

    await expect(
      setTodoCompletionUseCase({
        userId: 'user_123',
        assetId: 'nonexistent',
        completed: true,
      })
    ).rejects.toMatchObject({
      publicMessage: '没有找到这条待办，或你没有权限更新它。',
      code: WORKSPACE_APPLICATION_ERROR_CODES.TODO_NOT_FOUND,
    })
  })
})
