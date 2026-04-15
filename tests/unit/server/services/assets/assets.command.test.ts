import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAsset } from '@/server/services/assets/assets.command'

const mocks = vi.hoisted(() => ({
  insertMock: vi.fn(),
  valuesMock: vi.fn(),
  returningMock: vi.fn(),
  interpretAssetInputMock: vi.fn(),
  createAssetEmbeddingBestEffortMock: vi.fn(),
  toAssetListItemMock: vi.fn(),
}))

vi.mock('@/server/lib/db', () => ({
  db: {
    insert: mocks.insertMock,
  },
}))

vi.mock('@/server/lib/db/schema', () => ({
  assets: Symbol('assets'),
}))

vi.mock('@/server/services/assets/assets.interpreter', () => ({
  interpretAssetInput: mocks.interpretAssetInputMock,
}))

vi.mock('@/server/services/assets/assets.embedding', () => ({
  createAssetEmbeddingBestEffort: mocks.createAssetEmbeddingBestEffortMock,
}))

vi.mock('@/server/services/assets/assets.mapper', () => ({
  toAssetListItem: mocks.toAssetListItemMock,
}))

describe('assets.command', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.insertMock.mockReturnValue({ values: mocks.valuesMock })
    mocks.valuesMock.mockReturnValue({ returning: mocks.returningMock })
  })

  describe('createAsset', () => {
    it('throws EMPTY_INPUT for blank text', async () => {
      await expect(createAsset({ userId: 'u1', text: '   ' })).rejects.toThrow('EMPTY_INPUT')
      expect(mocks.interpretAssetInputMock).not.toHaveBeenCalled()
      expect(mocks.insertMock).not.toHaveBeenCalled()
    })

    it('returns summary command without DB write', async () => {
      mocks.interpretAssetInputMock.mockResolvedValue({
        intent: 'summarize_assets',
        summaryTarget: 'all',
        query: '总结今天',
      })

      const result = await createAsset({ userId: 'u1', text: '总结今天' })

      expect(result).toEqual({
        kind: 'summary',
        summaryTarget: 'all',
        query: '总结今天',
      })
      expect(mocks.insertMock).not.toHaveBeenCalled()
      expect(mocks.createAssetEmbeddingBestEffortMock).not.toHaveBeenCalled()
    })

    it('returns search command without DB write', async () => {
      mocks.interpretAssetInputMock.mockResolvedValue({
        intent: 'search_assets',
        query: '找本周todo',
        typeHint: 'todo',
        timeHint: '本周',
        completionHint: 'incomplete',
      })

      const result = await createAsset({ userId: 'u1', text: '找本周todo' })

      expect(result).toEqual({
        kind: 'search',
        query: '找本周todo',
        typeHint: 'todo',
        timeHint: '本周',
        completionHint: 'incomplete',
      })
      expect(mocks.insertMock).not.toHaveBeenCalled()
    })

    it('creates link asset and schedules embedding', async () => {
      const created = {
        id: 'a1',
        userId: 'u1',
        originalText: 'https://example.com',
        type: 'link',
        url: 'https://example.com',
        timeText: null,
        dueAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const mapped = { id: 'a1', type: 'link' }

      mocks.interpretAssetInputMock.mockResolvedValue({
        intent: 'create_link',
        url: 'https://example.com',
        timeText: null,
        dueAt: null,
      })
      mocks.returningMock.mockResolvedValue([created])
      mocks.toAssetListItemMock.mockReturnValue(mapped)

      const result = await createAsset({ userId: 'u1', text: ' https://example.com ' })

      expect(mocks.insertMock).toHaveBeenCalledTimes(1)
      expect(mocks.valuesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          originalText: 'https://example.com',
          type: 'link',
          url: 'https://example.com',
        })
      )
      expect(mocks.createAssetEmbeddingBestEffortMock).toHaveBeenCalledWith(created)
      expect(result).toEqual({ kind: 'created', asset: mapped })
    })

    it('creates todo asset with dueAt', async () => {
      const dueAt = new Date('2026-04-20T01:00:00.000Z')
      const created = {
        id: 't1',
        userId: 'u1',
        originalText: '明天做作业',
        type: 'todo',
        url: null,
        timeText: '明天',
        dueAt,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mocks.interpretAssetInputMock.mockResolvedValue({
        intent: 'create_todo',
        url: null,
        timeText: '明天',
        dueAt,
      })
      mocks.returningMock.mockResolvedValue([created])
      mocks.toAssetListItemMock.mockReturnValue({ id: 't1', type: 'todo' })

      await createAsset({ userId: 'u1', text: '明天做作业' })

      expect(mocks.valuesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'todo',
          timeText: '明天',
          dueAt,
        })
      )
    })

    it('falls back to note creation for normal note intent', async () => {
      const created = {
        id: 'n1',
        userId: 'u1',
        originalText: '普通笔记',
        type: 'note',
        url: null,
        timeText: null,
        dueAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mocks.interpretAssetInputMock.mockResolvedValue({
        intent: 'create_note',
        timeText: null,
        dueAt: null,
      })
      mocks.returningMock.mockResolvedValue([created])
      mocks.toAssetListItemMock.mockReturnValue({ id: 'n1', type: 'note' })

      await createAsset({ userId: 'u1', text: '普通笔记' })

      expect(mocks.valuesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'note',
          url: null,
        })
      )
    })
  })
})
