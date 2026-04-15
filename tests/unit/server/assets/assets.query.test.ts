import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  listAssets,
  listIncompleteTodoAssets,
  listLinkAssets,
  listNoteAssets,
  listRecentAssets,
  listTodoAssets,
} from '../../../../server/assets/assets.query'
import {
  ASSET_LIST_LIMIT_MAX,
  ASSET_RECENT_LIMIT_MAX,
} from '@/server/config/constants'

const mocks = vi.hoisted(() => ({
  selectMock: vi.fn(),
  fromMock: vi.fn(),
  whereMock: vi.fn(),
  orderByMock: vi.fn(),
  limitMock: vi.fn(),
  toAssetListItemMock: vi.fn(),
}))

vi.mock('@/server/db', () => ({
  db: {
    select: mocks.selectMock,
  },
}))

vi.mock('@/server/db/schema', () => ({
  assets: {
    userId: Symbol('userId'),
    type: Symbol('type'),
    completedAt: Symbol('completedAt'),
    createdAt: Symbol('createdAt'),
    dueAt: Symbol('dueAt'),
  },
}))

vi.mock('../../../../server/assets/assets.mapper', () => ({
  toAssetListItem: mocks.toAssetListItemMock,
}))

describe('assets.query', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.selectMock.mockReturnValue({ from: mocks.fromMock })
    mocks.fromMock.mockReturnValue({ where: mocks.whereMock })
    mocks.whereMock.mockReturnValue({ orderBy: mocks.orderByMock })
    mocks.orderByMock.mockReturnValue({ limit: mocks.limitMock })
    mocks.limitMock.mockResolvedValue([])
    mocks.toAssetListItemMock.mockImplementation((row) => ({ id: row.id }))
  })

  describe('listAssets', () => {
    it('maps db rows to AssetListItem', async () => {
      mocks.limitMock.mockResolvedValue([{ id: 'a1' }, { id: 'a2' }])

      const result = await listAssets({ userId: 'u1', type: 'todo', limit: 10 })

      expect(mocks.limitMock).toHaveBeenCalledWith(10)
      expect(mocks.toAssetListItemMock).toHaveBeenCalledTimes(2)
      expect(result).toEqual([{ id: 'a1' }, { id: 'a2' }])
    })

    it('clamps limit to ASSET_LIST_LIMIT_MAX', async () => {
      await listAssets({ userId: 'u1', limit: ASSET_LIST_LIMIT_MAX + 999 })
      expect(mocks.limitMock).toHaveBeenCalledWith(ASSET_LIST_LIMIT_MAX)
    })
  })

  describe('listLinkAssets', () => {
    it('uses link type', async () => {
      await listLinkAssets('u1', 7)
      expect(mocks.limitMock).toHaveBeenCalledWith(7)
    })
  })

  describe('listNoteAssets', () => {
    it('uses note type', async () => {
      await listNoteAssets('u1', 8)
      expect(mocks.limitMock).toHaveBeenCalledWith(8)
    })
  })

  describe('listTodoAssets', () => {
    it('uses todo type', async () => {
      await listTodoAssets('u1', 9)
      expect(mocks.limitMock).toHaveBeenCalledWith(9)
    })
  })

  describe('listIncompleteTodoAssets', () => {
    it('maps rows correctly', async () => {
      mocks.limitMock.mockResolvedValue([{ id: 'todo-1' }])
      const result = await listIncompleteTodoAssets('u1', 3)
      expect(mocks.limitMock).toHaveBeenCalledWith(3)
      expect(result).toEqual([{ id: 'todo-1' }])
    })
  })

  describe('listRecentAssets', () => {
    it('clamps limit to ASSET_RECENT_LIMIT_MAX', async () => {
      await listRecentAssets('u1', ASSET_RECENT_LIMIT_MAX + 100)
      expect(mocks.limitMock).toHaveBeenCalledWith(ASSET_RECENT_LIMIT_MAX)
    })
  })
})
