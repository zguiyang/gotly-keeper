import { describe, it, expect, vi, beforeEach } from 'vitest'

import { setWorkspaceTodoCompletion, WorkspaceModuleError, WORKSPACE_MODULE_ERROR_CODES } from '@/server/modules/workspace'

const setTodoCompletionMock = vi.hoisted(() => vi.fn())

vi.mock('@/server/services/todos', () => ({
  setTodoCompletion: setTodoCompletionMock,
}))

describe('setWorkspaceTodoCompletion', () => {
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
      bookmarkMeta: null,
      createdAt: new Date(),
    }
    setTodoCompletionMock.mockResolvedValue(mockAsset)

    const result = await setWorkspaceTodoCompletion({
      userId: 'user_123',
      assetId: 'asset_1',
      completed: true,
    })

    expect(result).toEqual(mockAsset)
    expect(setTodoCompletionMock).toHaveBeenCalledWith({
      userId: 'user_123',
      todoId: 'asset_1',
      completed: true,
    })
  })

  it('throws WorkspaceModuleError(TODO_NOT_FOUND) when setTodoCompletion returns null', async () => {
    setTodoCompletionMock.mockResolvedValue(null)

    await expect(
      setWorkspaceTodoCompletion({
        userId: 'user_123',
        assetId: 'nonexistent',
        completed: true,
      })
    ).rejects.toThrow(WorkspaceModuleError)

    await expect(
      setWorkspaceTodoCompletion({
        userId: 'user_123',
        assetId: 'nonexistent',
        completed: true,
      })
    ).rejects.toMatchObject({
      publicMessage: '没有找到这条待办，或你没有权限更新它。',
      code: WORKSPACE_MODULE_ERROR_CODES.TODO_NOT_FOUND,
    })
  })
})
