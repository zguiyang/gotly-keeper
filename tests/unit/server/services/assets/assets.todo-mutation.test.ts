import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setTodoCompletion } from '@/server/services/assets/assets.todo-mutation'

const mocks = vi.hoisted(() => ({
  updateMock: vi.fn(),
  setMock: vi.fn(),
  whereMock: vi.fn(),
  returningMock: vi.fn(),
  toAssetListItemMock: vi.fn(),
}))

vi.mock('@/server/lib/db', () => ({
  db: {
    update: mocks.updateMock,
  },
}))

vi.mock('@/server/lib/db/schema', () => ({
  assets: {
    id: Symbol('id'),
    userId: Symbol('userId'),
    type: Symbol('type'),
  },
}))

vi.mock('@/server/services/assets/assets.mapper', () => ({
  toAssetListItem: mocks.toAssetListItemMock,
}))

describe('assets.todo-mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.updateMock.mockReturnValue({ set: mocks.setMock })
    mocks.setMock.mockReturnValue({ where: mocks.whereMock })
    mocks.whereMock.mockReturnValue({ returning: mocks.returningMock })
  })

  describe('setTodoCompletion', () => {
    it('returns mapped asset when update succeeds', async () => {
      const updated = {
        id: 'todo-1',
        userId: 'u1',
        type: 'todo',
      }
      const mapped = { id: 'todo-1', completed: true }

      mocks.returningMock.mockResolvedValue([updated])
      mocks.toAssetListItemMock.mockReturnValue(mapped)

      const result = await setTodoCompletion({
        userId: 'u1',
        assetId: 'todo-1',
        completed: true,
      })

      expect(mocks.updateMock).toHaveBeenCalledTimes(1)
      expect(mocks.setMock).toHaveBeenCalledWith(
        expect.objectContaining({
          completedAt: expect.any(Date),
          updatedAt: expect.any(Date),
        })
      )
      expect(mocks.toAssetListItemMock).toHaveBeenCalledWith(updated)
      expect(result).toEqual(mapped)
    })

    it('returns null when no rows are updated', async () => {
      mocks.returningMock.mockResolvedValue([])

      const result = await setTodoCompletion({
        userId: 'u1',
        assetId: 'missing',
        completed: false,
      })

      expect(mocks.setMock).toHaveBeenCalledWith(
        expect.objectContaining({
          completedAt: null,
          updatedAt: expect.any(Date),
        })
      )
      expect(mocks.toAssetListItemMock).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })
  })
})
